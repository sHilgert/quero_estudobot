"use strict";
const TelegramBot = require('node-telegram-bot-api');

//Ambient
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const URL = process.env.APP_URL;
const PORT = process.env.PORT;

//Bot
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

bot.onText(/\/echo (.+)/, (msg, match) => {
 
  const chatId = msg.chat.id;
  const resp = match[1]; 
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/ping /, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "pingando o servidor");
  
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Received your message');
});