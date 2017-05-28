const mongoose = require('mongoose');
var Link = require('../models/link');

exports.create =function (linkObject){
  const link = new Link(linkObject);
  return link.save();
  
};

exports.update = function(linkObject){
  Link.findOne({chatId: linkObject.chatId, messageId: linkObject.messageId}, function(err, link){
    if(err) throw err;
    link.like = linkObject.like;
    link.dislike = linkObject.dislike;
    link.save();
  });
};

exports.findByMessageAndChat = function(messageId, chatId, res){
  Link.findOne({chatId: chatId, messageId: messageId}, function(err, link){
    if(err) throw err;
    res(link);
  });
};

function findMessageAndChat(messageId, chatId, res){
  Link.findOne({chatId: chatId, messageId: messageId}, function(err, link){
    if(err) throw err;
    res(link);
  });
};

exports.allLinks = function(id, res){
  
  Link.find({chatId: id}, function(err, links) {
    if (err) throw err;
    res(links);
  });
};

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].userId == obj.userId) {
            return true;
        }
    }

    return false;
}