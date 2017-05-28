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

//conexao com o webservice
var conecao = '14c83884.ngrok.io';


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
        
         console.log("ENTROU NO ENVIO DE LINKS " + msg);
          var temp = {};
          temp['chatId'] = msg.chat.id;
          temp['messageId'] = msg.message_id;
          temp['member'] = msg.from;
          temp['name'] = msg.from.first_name,
          temp['link'] = link;
          temp['like'] = 0;
          temp['dislike'] = 0;
        
          var body = JSON.stringify(temp);
          var request = new http.ClientRequest({
            hostname: conecao,
            path: "/app/content",
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
        
        bot.sendMessage(chatId, msg.from.first_name + " posted a link:\n" + link, options);
        
      }
    });
  }
});

bot.on('new_chat_participant', (msg) => {
  if(msg.new_chat_participant.id !== 387683658){
    bot.sendMessage(msg.chat.id, 'Welcome');
  console.log("ENTROU NO NEW MEMBER " + msg);
  var temp = msg.new_chat_participant;
  temp['chatId'] = msg.chat.id;
  
  var body = JSON.stringify(temp);
  var request = new http.ClientRequest({
    hostname: conecao,
    path: "/app/member",
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
  } else {
     console.log("ENTROU NO NEW");
  
  var body = JSON.stringify(msg.chat); 
  var request = new http.ClientRequest({
    hostname: conecao,
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
  }
});


bot.on('left_chat_participant', (msg) => {
  bot.sendMessage(msg.chat.id, 'saiu');
  console.log("ENTROU NO LEFT MEMBER " + msg);
  var temp = msg.left_chat_participant;
  temp['chatId'] = msg.chat.id;
  
  var body = JSON.stringify(temp);
  var request = new http.ClientRequest({
    hostname: conecao,
    path: "/app/member",
    method: "DELETE",
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

bot.onText(/new/, function(msg){
 console.log("ENTROU NO NEW");
  
  var body = JSON.stringify(msg.chat); 
  var request = new http.ClientRequest({
    hostname: conecao,
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

bot.on('callback_query', function(msg) {
  if(msg.data){
    if(msg.data === 'like' || msg.data === 'dislike'){
      linkController.addLink(msg, function (res){
        console.log(">>>>>>resposta0: " + JSON.stringify(res));
        if(res.needReply === 1)
          replyInlineButton(bot, res.link, res.msg)
        bot.answerCallbackQuery(res.id, res.data);
      });
        
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
    host: conecao,
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