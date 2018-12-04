/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

var thread_id_delete = ''
var thread_id_base = ''
var reply_id = ''

suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('without text', function(done) {
        chai.request(server)
          .post('/api/threads/testing')
          .send({
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid text')
            done()
          })
      })
      
      test('without delete_password', function(done) {
        chai.request(server)
          .post('/api/threads/testing')
          .send({
            text: 'Thread 1'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid delete_password')
            done()
          })
      })
      
      test('without text or delete_password', function(done) {
        chai.request(server)
          .post('/api/threads/testing')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid text, delete_password')
            done()
          })
      })
      
      test('with all fields filled', function(done) {
        chai.request(server)
          .post('/api/threads/testing')
          .send({
            text: 'Thread 1',
            delete_password: 'password'
          })
          .end(function(err, res) {
            // TODO: check for redirect
            console.log(res.headers)
            assert.equal(res.status, 200)
            done()
          })
      })
      
      test('FUTURE used for deleting later', function(done) {
        chai.request(server)
          .post('/api/threads/testing')
          .send({
            text: 'Delete Me',
            delete_password: 'deleteme'
          })
          .end(function(err, res) {
            // TODO: check for redirect
            assert.equal(res.status, 200)
            done()
          })
      })
    })
    
    suite('GET', function() {
      test('board exists in db', function(done) {
        chai.request(server)
          .get('/api/threads/testing')
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.isArray(res.body)
            assert.property(res.body[1], '_id')
            assert.property(res.body[1], 'text')
            assert.property(res.body[1], 'replies')
            assert.property(res.body[1], 'created_on')
            assert.property(res.body[1], 'bumped_on')
            assert.equal(res.body[1].text, 'Thread 1')
            assert.isArray(res.body[1].replies)
            assert.equal(res.body[1].replies.length, 0)
            assert.equal(res.body[1].created_on, res.body[1].bumped_on)
            thread_id_base = res.body[1]._id
            thread_id_delete = res.body[0]._id

            done()
          })
      })
    })
    
    suite('DELETE', function() {
      test('with no password', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ thread_id: thread_id_delete })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid delete_password')
            
            done()
          })
      })
      
      test('with no thread_id', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ delete_password: 'password' })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id')
            
            done()
          })
      })
      
      test('with no password and thread_id', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id, delete_password')
            
            done()
          })
      })
      
      test('with incorrect password', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ thread_id: thread_id_delete, delete_password: 'dontdeleteme' })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'incorrect password')
            
            done()
          })
      })
      
      test('with wrong id', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ thread_id: '5c05a8b084900700de246e02', delete_password: 'deleteme' })
          .end(function(err, res) {
            assert.equal(res.status, 404)
            assert.equal(res.text, 'no thread found associated with id 5c05a8b084900700de246e02')
            

            done()
          })
      })
      
      test('with correct password and id', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ thread_id: thread_id_delete, delete_password: 'deleteme' })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.equal(res.text, 'success')
            
            done()
          })
      })
      
    });
    
    suite('PUT', function() {
      
      test('report a thread without id', function(done) {
        chai.request(server)
          .put('/api/threads/testing')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id')            

            done()
          })
      })
      
      test('report a thread with invalid id', function(done) {
        chai.request(server)
          .put('/api/threads/testing')
          .send({ thread_id: '5c05a8b084900700de246e02' })
          .end(function(err, res) {
            assert.equal(res.status, 404)
            assert.equal(res.text, 'no thread found associated with id 5c05a8b084900700de246e02')
            
            done()
          })
      })
      
      test('report a thread with valid id', function(done) {
        chai.request(server)
          .put('/api/threads/testing')
          .send({ thread_id: thread_id_base })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.equal(res.text, 'success')
            
            done()
          })
      })
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      test('without text', function(done) {
        chai.request(server)
          .post('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid text')
            
            done()
          })
      })
      
      test('without thread_id', function(done) {
        chai.request(server)
          .post('/api/replies/testing')
          .send({
            text: 'Reply Post 1',
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id')
            
            done()
          })
      })
      
      test('without delete_password', function(done) {
        chai.request(server)
          .post('/api/replies/testing')
          .send({
            text: 'Reply Post 1',
            thread_id: thread_id_base
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid delete_password')
            
            done()
          })
      })
      
      test('without text, thread_id, delete_password', function(done) {
        chai.request(server)
          .post('/api/replies/testing')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id, text, delete_password')
            
            done()
          })
      })
      
      test('with all fields filled', function(done) {
        chai.request(server)
          .post('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            text: 'Reply Post 1',
            delete_password: 'password'
          })
          .end(function(err, res) {
            // TODO: check for redirect
            assert.equal(res.status, 200)
            
            done()
          })
      })
      
    });
    
    suite('GET', function() {
      test('with proper thread_id filled', function(done) {
        chai.request(server)
          .get('/api/replies/testing')
          .query({ thread_id: thread_id_base })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.property(res.body, '_id')
            assert.property(res.body, 'text')
            assert.property(res.body, 'replies')
            assert.property(res.body, 'created_on')
            assert.property(res.body, 'bumped_on')
            assert.isAbove(res.body.bumped_on, res.body.created_on)
            
            assert.isArray(res.body.replies)
            assert.equal(res.body.replies.length, 1)
            assert.property(res.body.replies[0], '_id')
            assert.property(res.body.replies[0], 'text')
            assert.property(res.body.replies[0], 'created_on')
            assert.equal(res.body.replies[0].created_on, res.body.bumped_on)
            
            reply_id = res.body.replies[0]._id
            
            done()
          })
      })
      
    });
    
    suite('PUT', function() {
      test('report without thread_id', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({
            reply_id: reply_id
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id')
            
            done()
          })
      })
      
      test('report without reply_id', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({
            thread_id: thread_id_base
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid reply_id')
            
            done()
          })
      })
      
      test('report without thread_id, reply_id', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id, reply_id')
            
            done()
          })
      })
      
      test('report wrong thread_id', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({
            thread_id: '5c05a8b084900700de246e02',
            reply_id: reply_id
          })
          .end(function(err, res) {
            assert.equal(res.status, 404)
            assert.equal(res.text, 'no thread found associated with id 5c05a8b084900700de246e02')
            
            done()
          })
      })
      
      test('report wrong reply_id', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            reply_id: '5c05a8b084900700de246e02'
          })
          .end(function(err, res) {
            assert.equal(res.status, 404)
            assert.equal(res.text, 'no reply found associated with id 5c05a8b084900700de246e02')
            
            done()
          })
      })
      
      test('report with all fields filled', function(done) {
        chai.request(server)
          .put('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            reply_id: reply_id
          })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.equal(res.text, 'success')
            
            done()
          })
      })
      
    });
    
    suite('DELETE', function() {
      test('without thread_id', function(done) {
        chai.request(server)
          .delete('/api/replies/testing')
          .send({
            reply_id: reply_id,
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid thread_id')
            
            done()
          })
      })
      
      test('without reply_id', function(done) {
        chai.request(server)
          .delete('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid reply_id')
            
            done()
          })
      })
      
      test('without delete_password', function(done) {
        chai.request(server)
          .delete('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            reply_id: reply_id
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'invalid delete_password')
            
            done()
          })
      })
      
      test('invalid password', function(done) {
        chai.request(server)
          .delete('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            reply_id: reply_id,
            delete_password: 'password2'
          })
          .end(function(err, res) {
            assert.equal(res.status, 400)
            assert.equal(res.text, 'incorrect password')
            
            done()
          })
      })
      test('with all fields filled', function(done) {
        chai.request(server)
          .delete('/api/replies/testing')
          .send({
            thread_id: thread_id_base,
            reply_id: reply_id,
            delete_password: 'password'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.equal(res.text, 'success')
            
            done()
          })
      })
      
    });
    
  });
  
  suite('Clean up, deleting board', function() {
    test('delete with correct password and id', function(done) {
        chai.request(server)
          .delete('/api/threads/testing')
          .send({ thread_id: thread_id_base, delete_password: 'password' })
          .end(function(err, res) {
            assert.equal(res.status, 200)
            assert.equal(res.text, 'success')
            
            done()
          })
      })      
  })

});
