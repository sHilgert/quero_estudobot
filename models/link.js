'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LinkSchema = new Schema({
  chatId: Number,
  userId: Number,
  name: String,
  link: String,
  like: {
    count: Number,
    users: [{_id:false, userId: Number}]
  },
  dislike: {
    count: Number,
    users: [{_id:false, userId: Number}]
  },
  messageId: Number,
  desc: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

LinkSchema.methods = {
  likeAndSave: function(){
    this.like = this.like + 1;
    return this.save();
  },
  
  dislikeAndSave: function(){
    this.dislike = this.dislike + 1;
    return this.save();
  }
};

var link = mongoose.model('Link', LinkSchema);

module.exports = link;