const mongoose = require('mongoose');
var Link = require('../models/link');

exports.addLink = function(msg){
  console.log("CALLBACK: " + JSON.stringify(msg));
  return new Promise((resolve, reject) => {
    var resp = {};
      var user = msg.from;
      var userId = {userId: user.id};
      if(msg.data)
        var data = msg.data;
      if(data && data === 'dislike'){
        console.log(">>>>>>resposta1: " + JSON.stringify(resp));
        this.findByMessageAndChat(msg.message.message_id - 1,
          msg.message.chat.id, function(link){
          if(!containsObject(userId, link.dislike.users)){
            if(!containsObject(userId, link.like.users)){
              link.dislike.count++;
              link.dislike.users.push(userId);
              console.log(">>>>>>resposta2: " + JSON.stringify(resp));
              resp['needReply'] = 1;
              resp['link'] = link;
              resp['msg'] = msg;
              resp['id'] = msg.id;
              resp['data'] = 'You disliked ' + user.first_name + ' link';
              console.log(">>>>>>resposta3: " + JSON.stringify(resp));
            }else{
              link.like.count--;
              var index = link.like.users.indexOf(userId);
              link.like.users.splice(index, 1);
              
              link.dislike.count++;
              link.dislike.users.push(userId);
              resp['needReply'] = 1;  
              resp['link'] = link;
              resp['id'] = msg.id;
              resp['msg'] = msg;
              resp['data'] = 'You disliked ' + user.first_name + ' link';
            }
          }else{
            resp['needReply'] = 0;
            resp['data'] = 'You already disliked ' + user.first_name + ' link';
            resp['id'] = msg.id;
          }
        });
        
      }else if (data && data === 'like'){
        this.findByMessageAndChat(msg.message.message_id - 1,
          msg.message.chat.id, function(link){
          if(!containsObject(userId, link.like.users)){
            if(!containsObject(userId, link.dislike.users)){
              link.like.count++;
              link.like.users.push(userId);
              resp['needReply'] = 1;
              resp['link'] = link;
              resp['msg'] = msg;
              resp['id'] = msg.id;
              resp['data'] = 'You liked ' + user.first_name + ' link';
              
            }else{
              link.dislike.count--;
              var index = link.dislike.users.indexOf(userId);
              link.dislike.users.splice(index, 1);
              
              link.like.count++;
              link.like.users.push(userId);
              
              resp['needReply'] = 1;
              resp['link'] = link;
              resp['msg'] = msg;
              resp['id'] = msg.id;
              resp['data'] = 'You liked ' + user.first_name + ' link';
            }
          }else{
            resp['needReply'] = 0;
            resp['data'] = 'You already disliked ' + user.first_name + ' link';
            resp['id'] = msg.id;
          }
        });
      }
      console.log("RESP DEPOIS >>>: " + JSON.stringify(resp));
      return resolve(resp);
  });
};

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