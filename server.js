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
    var user = msg.from;
    var userId = {userId: user.id};
    var data = msg.data;
    if(data === 'dislike'){
      linkController.findByMessageAndChat(msg.message.message_id - 1,
        msg.message.chat.id, function(link){
        if(!containsObject(userId, link.dislike.users)){
          if(!containsObject(userId, link.like.users)){
            link.dislike.count++;
            link.dislike.users.push(userId);
            
            replyInlineButton(bot, link, msg);  

            bot.answerCallbackQuery(msg.id, 
            'You disliked ' + user.first_name + ' link');
          }else{
            link.like.count--;
            var index = link.like.users.indexOf(userId);
            link.like.users.splice(index, 1);
            
            link.dislike.count++;
            link.dislike.users.push(userId);
            replyInlineButton(bot, link, msg);  

            bot.answerCallbackQuery(msg.id, 
            'You disliked ' + user.first_name + ' link');
          }
        }else{
          bot.answerCallbackQuery(msg.id, 
          'You already disliked ' + user.first_name + ' link');
        }
      });
      
    }else if (data === 'like'){
      linkController.findByMessageAndChat(msg.message.message_id - 1,
        msg.message.chat.id, function(link){
        if(!containsObject(userId, link.like.users)){
          if(!containsObject(userId, link.dislike.users)){
            link.like.count++;
            link.like.users.push(userId);
            
            replyInlineButton(bot, link, msg);  

            bot.answerCallbackQuery(msg.id, 
            'You liked ' + user.first_name + ' link');
          }else{
            link.dislike.count--;
            var index = link.dislike.users.indexOf(userId);
            link.dislike.users.splice(index, 1);
            
            link.like.count++;
            link.like.users.push(userId);
            replyInlineButton(bot, link, msg);  

            bot.answerCallbackQuery(msg.id, 
            'You liked ' + user.first_name + ' link');
          }
        }else{
          bot.answerCallbackQuery(msg.id, 
          'You already liked ' + user.first_name + ' link');
        }
      });
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

bot.on('message', (msg) => {
  console.log(msg);
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Received your message');
});


function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].userId == obj.userId) {
            return true;
        }
    }

    return false;
}

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