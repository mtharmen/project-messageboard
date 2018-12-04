/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var mongoose = require('mongoose')
var bcrypt = require('bcrypt')
var ObjectId = mongoose.Schema.Types.ObjectId

let id = mongoose.Types.ObjectId

var postSchema = new mongoose.Schema({
  text           : String, 
  created_on     : Date,
  bumped_on      : Date,
  delete_password: { type: String, select: false },
  reported       : { type: Boolean, default: false, select: false },
  replies        : [{
    _id            : String,
    text           : String,
    created_on     : { type: Date, default: new Date() },
    delete_password: { type: String, select: false },
    reported       : { type: Boolean, default: false, select: false }
  }]
})

postSchema.pre('save', function(next) {
  if (!this.created_on) {
    this.created_on = new Date()
  }
  
  let latest = this.created_on
  this.replies.forEach(reply => {
    latest = reply.created_on > latest ? reply.created_on : latest
  })
  this.bumped_on = latest
  next()
})

function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

function validPassword(password, hashed_password) {
  return bcrypt.compareSync(password, hashed_password);
}


// sournce: https://stackoverflow.com/questions/19961387/trying-to-get-a-list-of-collections-from-mongoose
function getCollections() {
  return new Promise((resolve, reject) => {
    let collectionStore = []
    
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) { reject(err) }
      collections.forEach(collection => {
        if (collection.name !== 'system.indexes') {
          collectionStore.push(collection.name)
        }
      })
      resolve(collectionStore)
    })
  })
}


function getModel(name) {
  return getCollections()
    .then(collections => {
      let n = collections.indexOf(name)
      // NOTE: not sure why this distinction needs to be made but it doesn't return the pre-existing collection otherwise
      if (n > -1) {
        return mongoose.model(collections[n], postSchema, collections[n])
      } else {
        return mongoose.model(name, postSchema, name)
      }
    })
    // .catch(err => {
    //   console.log(err)
    // })
}

function errorMessage(inputs, fields) {
  let errors = []
  fields.forEach(field => {
    if (!inputs[field]) {
      errors.push(field)
    }
  })
  
  if (errors.length) {
    return 'invalid ' + errors.join(', ')
  }
  return false
}

// function generatePassword() {
//   let alphanumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
//   let password = ''
//   let n = 0
//   while (password.length < 16) {
//     n = Math.floor(Math.random() * alphanumeric.length)
//     password += alphanumeric[n]
//   }
//   return password
// }

// TODO: figure out how to generally santize inputs ?

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post((req, res) => {
      let board = req.params.board
      let text = req.body.text
      let delete_password = req.body.delete_password
    
      let errors = errorMessage({ board, text, delete_password }, ['board', 'text', 'delete_password'])
      if (errors) {
        res.status(400).send(errors)
        return
      }
      
      getModel(board)
        .then(Model => {
          let post = new Model({ text, delete_password: generateHash(delete_password) })
          return post.save()
        })
        .then(post => {
          // post.delete_password = delete_password
          // res.json(post)
          res.redirect('/b/' + board + '/')
        })
        .catch(err => {
          res.send(err)
        })
    })
    .get((req, res) => {
      let board = req.params.board
      
      if (!board) {
        res.status(400).send('invalid board')
        return
      }
    
      getModel(board)
        .then(Model => {
          // return Model.find({}).sort({ bumped_on: -1 }).limit(10).slice('replies', -3).exec()
          return Model.aggregate([
            { $project: {
                text: 1,
                created_on: 1,
                bumped_on: 1,
                replycount: { $size: '$replies' },
                'replies._id': 1,
                'replies.text': 1,
                'replies.created_on': 1
                // replies: { $slice: ['$replies',  -3] }
              }
            },
            { '$sort': { 'bumped_on': -1 } },
            { '$limit': 10 }
          ]).exec()
        })
        .then(threads => {
          let limited = threads.map(thread => {
            thread.replies = thread.replies.slice(-3)
          })
          res.json(threads)
        })
        .catch(err => {
          console.log(err)
          res.send(err)
        })
    })
    .delete((req, res) => {
      let board = req.params.board
      let thread_id = req.body.thread_id
      let delete_password = req.body.delete_password
    
      let errors = errorMessage({ board, thread_id, delete_password }, ['board', 'thread_id', 'delete_password'])
      if (errors) {
        res.status(400).send(errors)
        return
      }
      
      getModel(board)
        .then(Model => {
          req.Model = Model
          return Model.findById(thread_id).select('+delete_password')
        })
        .then(thread => {
          if (!thread) {
            throw { code: 404, msg: 'no thread found associated with id ' + thread_id }
          }
          let valid = validPassword(delete_password, thread.delete_password)
          if (valid) {
            return req.Model.deleteOne({ _id: thread_id })
          } else {
            throw { code: 400, msg: 'incorrect password' }
          }
        })
        .then(deleted => {
          res.send('success')
        })
        .catch(err => {
          let code = err.code || 500
          let msg = err.msg || err
          res.status(code).send(msg)
        })
    })
    .put((req, res) => {
      let board = req.params.board
      let thread_id = req.body.thread_id
      
      let errors = errorMessage({ board, thread_id }, ['board', 'thread_id'])
      if (errors) {
        res.status(400).send(errors)
        return
      }    
      
      getModel(board)
        .then(Model => {
          return Model.findOneAndUpdate({ _id: thread_id }, { reported: true }, { new: true })
        })
        .then(reported => {
          if (!reported) {
            throw { code: 404, msg: 'no thread found associated with id ' + thread_id }
          }
          res.send('success')
        })
        .catch(err => {
          let code = err.code || 500
          let msg = err.msg || err
          res.status(code).send(msg)
        })
    })
    
  app.route('/api/replies/:board')
    .post((req, res) => {
      let board = req.params.board
      let thread_id = req.body.thread_id
      let text = req.body.text
      let delete_password = req.body.delete_password
         
      let errors = errorMessage({ board, thread_id, text, delete_password }, ['board', 'thread_id', 'text', 'delete_password'])
      if (errors) {
        res.status(400).send(errors)
        return
      }
      
      let reply_id = mongoose.Types.ObjectId() + ''
      let reply = {
        _id: reply_id,
        text: text,
        created_on: new Date(),
        delete_password: generateHash(delete_password),
        reported: false
      }
      
      getModel(board)
        .then(Model => {
          return Model.findById(thread_id)
        })
        .then(thread => {
          thread.replies.push(reply)
          return thread.save()
        })
        .then(saved => {
          // reply.delete_password = delete_password
          // res.json(reply)
          res.redirect('/b/' + board + '/' + thread_id)
        })
        .catch(err => {
          res.send(err)
        })
    })
    .get((req, res) => {
      let board = req.params.board
      let thread_id = req.query.thread_id
      
      if (!board) {
        res.status(400).send('invalid board')
        return
      }
      getModel(board)
        .then(Model => {
          return Model.findById(thread_id)
        })
        .then(thread => {
          res.json(thread)
        })
        .catch(err => {
          res.send(err)
        })
    })
    .delete((req, res) => {
      let board = req.params.board
      let thread_id = req.body.thread_id
      let reply_id = req.body.reply_id
      let delete_password = req.body.delete_password
    
      let errors = errorMessage({ board, thread_id, reply_id, delete_password }, ['board', 'thread_id', 'reply_id', 'delete_password'])
      if (errors) {
        res.status(400).send(errors)
        return
      }
      
      getModel(board)
        .then(Model => {
          req.Model = Model
          return Model.findOne({ _id: thread_id, 'replies._id': reply_id }, { 'replies.$': 1 }).select('+delete_password +replies.delete_password').exec()
        })
        .then(thread => {
          if (!thread) {
            throw { code: 404, msg: 'no reply found associated with id ' + reply_id }
          }
          let valid = validPassword(delete_password, thread.replies[0].delete_password)
          if (valid) {
            return req.Model.updateOne({ _id: thread_id, 'replies._id': reply_id }, { $set: { 'replies.$.text': '[deleted]' } }, { new: true })
          } else {
            throw { code: 400, msg: 'incorrect password' }
          }
        })
        .then(deleted => {
          res.send('success')
        })
        .catch(err => {
          let code = err.code || 500
          let msg = err.msg || err
          res.status(code).send(msg)
        })
    })
    .put((req, res) => {
      let board = req.params.board
      let thread_id = req.body.thread_id
      let reply_id = req.body.reply_id
    
      let errors = errorMessage({ board, thread_id, reply_id }, ['board', 'thread_id', 'reply_id'])
      if (errors) {
        res.status(400).send(errors)
        return
      }
      
      getModel(board)
        .then(Model => {
          req.Model = Model
          return Model.findOne({ _id: thread_id })
        })
        .then(post => {
          if (!post) {
            throw { code: 404, msg: 'no thread found associated with id ' + thread_id }
          }
          return req.Model
        })
        .then(Model => {
          return Model.findOneAndUpdate({ _id: thread_id, 'replies._id': reply_id }, { $set: { 'replies.$.reported': true } }, { new: true })
        })
        .then(reported => {
          if (!reported) {
            throw { code: 404, msg: 'no reply found associated with id ' + reply_id }
          }
          res.send('success')
        })
        .catch(err => {
          let code = err.code || 500
          let msg = err.msg || err
          res.status(code).send(msg)
        })
    })

};
