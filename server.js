"use strict";
var http = require('http');
var bayes = require('bayes')
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const greetingResp = "Oi!";
const helpResp = "Ola, estou vendo que voce precisa de ajuda. Para utilizar minhas funcionalidades é so me add no grupo! Eu consigo gerenciar os links enviados e disponibilizar pro pessoal dar aquela curtida ou quem sabe descurtir.";


var configDescription = false;

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
//var conecao = 'ed4f0e70.ngrok.io';

//Naive Bayes
var classifier = bayes()

classifier.learn('oi, e ae, ola, eai, eae, fala ae', 'greeting');
classifier.learn('oi', 'greeting');
classifier.learn('e ae', 'greeting');
classifier.learn('fala ae', 'greeting');
classifier.learn('ola', 'greeting');


classifier.learn('ajuda, help, como usar, comandos, usabilidade, nao sei usar', 'help');
classifier.learn('ajuda', 'help');
classifier.learn('help', 'help');
classifier.learn('comandos', 'help');

// Functions
bot.on('message', (msg) => {
  console.log(msg);
  const chatId = msg.chat.id;
  if(chatId === msg.from.id){
    var categorization = classifier.categorize(msg.text);
    console.log(categorization);
    if(categorization === 'help'){
       bot.sendMessage(chatId, helpResp);
    }else if (categorization === 'greeting' || categorization === 'greeeting'){
      bot.sendMessage(chatId, greetingResp);
    }else{
      bot.sendMessage(chatId,"Desculpe nao consegui entender o que voce quis dizer");
    }
  }else {
  if(configDescription){
    var temp = {};
    temp['chatId'] = chatId;
    temp['description'] = msg.text;
    configDescription = false;
        console.log("ENTROU NA DESCRIPTION " + msg);
          var body = JSON.stringify(temp);
          var request = new http.ClientRequest({
            hostname: conecao,
            path: "/app/chatDescription",
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
  }else{
  //bot.sendMessage(chatId, 'Received your message');
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
              [{ text: 'descurtir', callback_data: "dislike"}, { text: 'curtir', callback_data: "like"}]
            ]
          })
        };
        
        console.log("ENTROU NO ENVIO DE LINKS " + msg);
          var temp = {};
          temp['chatId'] = msg.chat.id;
          temp['messageId'] = msg.message_id;
          temp['member'] = msg.from;
          temp['link'] = link;
          temp['like'] = 0;
          temp['dislike'] = 0;
        
          var body = JSON.stringify(temp);
          var request = new http.ClientRequest({
            hostname: conecao,
            path: "/app/link",
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
        
        bot.sendMessage(chatId, msg.from.first_name + " postou um link:\n" + link, options);
        
      }
    });
  }
  }
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
  var chatId = msg.chat.id;
  var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'descricao', callback_data: "descricao"}]
      ]
    })
  };
  bot.sendMessage(chatId, 'Ola eu sou o bot Quero Estudos! Eu estou aqui para ajudar seu grupo de estudos ficar ainda melhor!', options);
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
  console.log("ENTROU 1 >>> " + JSON.stringify(msg));
  if(msg.data){
    console.log("ENTROU 2 >>> " + JSON.stringify(msg));
    var user = msg.from;
    var userId = {userId: user.id};
    var data = msg.data;
    if(data === 'like' || data === 'dislike'){
      console.log("ENTROU asasasas2 >>> " + JSON.stringify(msg));
      console.log("ENTROU LINKS >>> " + JSON.stringify(msg));
      var data = msg.data;
      if(data === 'dislike'){
        console.log("ENTROU 3 >>> " + JSON.stringify(msg));
        linkController.findByMessageAndChat(msg.message.message_id - 1,
          msg.message.chat.id, function(link){
            console.log("ENTROU 4 >>> " + JSON.stringify(link));
          if(!containsObject(userId, link.dislike.users)){
            if(!containsObject(userId, link.like.users)){
              link.dislike.count++;
              link.dislike.users.push(userId);
              console.log("ENTROU 5 >>> " + JSON.stringify(link));
              replyInlineButton(bot, link, msg);  
              
              console.log("ENTROU NO DISLIKE ENVIO DE LINKS " + msg);
            var temp = {};
            temp['chatId'] = msg.message.chat.id;
            temp['messageId'] = msg.message.message_id - 1;
            temp['member'] = msg.message.from,
            temp['link'] = link.link;
            temp['like'] = link.like.count;
            temp['dislike'] = link.dislike.count;
          
            var body = JSON.stringify(temp);
            var request = new http.ClientRequest({
              hostname: conecao,
              path: "/app/link",
              method: "PUT",
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
              
              bot.answerCallbackQuery(msg.id, 
              'Voce descurtiu o link do' + user.first_name);
              
            }else{
              link.like.count--;
              var index = link.like.users.indexOf(userId);
              link.like.users.splice(index, 1);
              
              link.dislike.count++;
              link.dislike.users.push(userId);
              replyInlineButton(bot, link, msg);
              
               
              console.log("ENTROU NO DISLIKE 2 ENVIO DE LINKS " + msg);
            var temp = {};
            temp['chatId'] = msg.message.chat.id;
            temp['messageId'] = msg.message.message_id  - 1;
            temp['member'] = msg.message.from,
            temp['link'] = link.link;
            temp['like'] = link.like.count;
            temp['dislike'] = link.dislike.count;
          
            var body = JSON.stringify(temp);
            var request = new http.ClientRequest({
              hostname: conecao,
              path: "/app/link",
              method: "PUT",
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
  
              bot.answerCallbackQuery(msg.id, 
              'Voce descurtiu o link do' + user.first_name);
            }
          }else{
            bot.answerCallbackQuery(msg.id, 
            'Voce ja descurtiu o link do' + user.first_name);
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
               console.log()
              console.log("ENTROU NO LIKE ENVIO DE LINKS " + msg);
            var temp = {};
            temp['chatId'] = msg.message.chat.id;
            temp['messageId'] = msg.message.message_id - 1;
            temp['member'] = msg.message.from,
            temp['link'] = link.link;
            temp['like'] = link.like.count;
            temp['dislike'] = link.dislike.count;
          
            var body = JSON.stringify(temp);
            var request = new http.ClientRequest({
              hostname: conecao,
              path: "/app/link",
              method: "PUT",
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
  
              bot.answerCallbackQuery(msg.id, 
              'Voce curtiu o link do ' + user.first_name);
            }else{
              link.dislike.count--;
              var index = link.dislike.users.indexOf(userId);
              link.dislike.users.splice(index, 1);
              
              link.like.count++;
              link.like.users.push(userId);
              replyInlineButton(bot, link, msg);
               
              console.log("ENTROU NO LIKE 2 ENVIO DE LINKS " + msg);
            var temp = {};
            temp['chatId'] = msg.message.chat.id;
            temp['messageId'] = msg.message.message_id - 1;
            temp['member'] = msg.message.from,
            temp['link'] = link.link;
            temp['like'] = link.like.count;
            temp['dislike'] = link.dislike.count;
          
            var body = JSON.stringify(temp);
            var request = new http.ClientRequest({
              hostname: conecao,
              path: "/app/link",
              method: "PUT",
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
  
              bot.answerCallbackQuery(msg.id, 
              'Voce curtiu o link do ' + user.first_name);
            }
          }else{
            bot.answerCallbackQuery(msg.id, 
            'Voce ja curtiu o link do ' + user.first_name);
          }
        });
      }
        
    }else if (data === 'descricao'){
        if(data === 'descricao'){
          bot.sendMessage(msg.message.chat.id, 'Digite a descricao do grupo');
          configDescription = true;
        }
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
        [{ text: link.dislike.count + ' descurtir ', callback_data: "dislike"},
        { text: link.like.count + ' curtir', callback_data: "like"}]
      ]
  };
  
  bot.editMessageReplyMarkup(settings, 
  {message_id: msg.message.message_id, chat_id: msg.message.chat.id});
}

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].userId == obj.userId) {
            return true;
        }
    }

    return false;
}