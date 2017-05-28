"use strict";
var http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Controllers
const linkController = require('./controllers/linkController');

//Ambient
const TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const URL = process.env.APP_URL;
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB;

//MongoDB
var mongoOptions = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } };       
 
 
mongoose.connect(MONGODB_URI, mongoOptions);
var conn = mongoose.connection;             
conn.on('error', console.error.bind(console, 'connection error:'));  
 
conn.once('open', function() {
  console.log("connected");
});

// Bot
const botOptions = {
  webHook: {
    port: PORT
  }
};
const bot = new TelegramBot(TOKEN, botOptions);
bot.setWebHook(`${URL}/bot${TOKEN}`);


//Error Handlers
bot.on('polling_error', (error) => console.log(error.code));
bot.on('webhook_error', (error) => console.log(error.code));


// Functions
bot.on('message', (msg) => {
  console.log(msg);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Received your message');
  if(msg.entities){
    msg.entities.forEach(function(entity){
      const chatId = msg.chat.id;
      console.log(msg);
      const link = msg.text.substring(entity.offset, entity.offset + entity.length);
      if(entity.type && entity.type === 'url'){
        
        linkController.create({
          messageId: msg.message_id,
          chatId: msg.chat.id,
          userId: msg.from.id,
          name: msg.from.first_name,
          link: link,
          like: {count: 0, users: []},
          dislike: {count: 0, users: []},
          desc: ""
        },
        
        function (err) {
          if (err) 
            console.log(err);
        });
        
        var options = {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: 'dislike', callback_data: "dislike"}, { text: 'like', callback_data: "like"}]
            ]
          })
        };
        
        bot.sendMessage(chatId, msg.from.first_name + " posted a link:\n" + link, options);
        
      }
    });
  }
});

bot.onText(/all/, function (msg) {
    var userId = msg.from.id;
    var chatId = msg.chat.id;
    
    bot.sendMessage(chatId, "links send via private chat");
    bot.sendMessage(userId, "- new links comming -");

    linkController.allLinks(chatId ,function(res){
      res.forEach(function(r){
        bot.sendMessage(userId, r.name + "\n" + 
        r.link + "\nlikes: " + r.like.count + 
        "\ndislikes:" + r.dislike.count);
      });
    });
});

bot.onText(/new/, function(msg){
  console.log("ENTROU 1");
  
  var body = JSON.stringify(msg.chat); 
  var request = new http.ClientRequest({
    hostname: 'f29b3ed3.ngrok.io',
    path: "/app/chat",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
    }
  });

  request.end(body);
  request.on('response', function (response) {
    console.log('STATUS: ' + response.statusCode);
    console.log('HEADERS: ' + JSON.stringify(response.headers));
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
    });
  });
});

bot.onText(/links/, function (msg) {
  var chatId = msg.chat.id;
  var opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [['all'],['choose user']],
        one_time_keyboard: true,
        selective: true
      })
    };
  bot.sendMessage(chatId,'select option', opts);
});

bot.onText(/\/drive/, function (msg) {
  var chatId = msg.chat.id;
  var opts = {
      reply_to_message_id: msg.message_id,
      reply_markup: JSON.stringify({
        keyboard: [['links', 'files'],['remainders']],
        selective: true
      })
    };
    bot.sendMessage(chatId, 'select a drive service', opts);
});

bot.on('callback_query', function(msg) {
  if(msg.data){
    if(msg.data === 'like' || msg.data === 'dislike'){
      var resp = linkController.addLink(msg);
      console.log(">>>>>>resposta0: " + JSON.stringify(resp));
      if(resp.needReply === 1)
        replyInlineButton(bot, resp.link, resp.msg)
      bot.answerCallbackQuery(resp.id, resp.data);
    }
  }
});

bot.onText(/\/echo (.+)/, (msg, match) => {
 
 const chatId = msg.chat.id;
  const resp = match[1]; 
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/ping/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "tentando pingar o servidor...");
  var options = {
    host: '156fe330.ngrok.io',
    path: '/app/ping',
    method : 'GET'
  };
  
  http.get(options, function(resp){
    console.log(resp);
    resp.on('data', function(chunk){
      bot.sendMessage(chatId, "deu certo: " + chunk);
    });
  }).on("error", function(e){
    bot.sendMessage(chatId, "deu erro: "+ e.message);
    console.log("Got error: " + e.message);
  });
});

function replyInlineButton(bot, link, msg){
  linkController.update(link);
  
  var settings = {
    inline_keyboard: [
        [{ text: link.dislike.count + ' dislike ', callback_data: "dislike"},
        { text: link.like.count + ' like', callback_data: "like"}]
      ]
  };
  
  bot.editMessageReplyMarkup(settings, 
  {message_id: msg.message.message_id, chat_id: msg.message.chat.id});
}