/*
   Copyright 2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

   Licensed under the Apache License, Version 2.0 (the "License"). You
   may not use this file except in compliance with the License. A copy
   of the License is located at

      http://aws.amazon.com/apache2.0/

   or in the "license" file accompanying this file. This file is
   distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
   OF ANY KIND, either express or implied. See the License for the
   specific language governing permissions and limitations under the
   License.
 */
var express = require('express');
var app = express();
var path = require('path');
var os = require('os');
var bodyParser = require('body-parser');
var fs = require('fs');
var dbconfig = require('./opsworks');
var mysql = require('mysql');

app.locals.hostname = dbconfig.db['host'];
app.locals.username = dbconfig.db['username'];
app.locals.password = dbconfig.db['password'];
app.locals.port = dbconfig.db['port'];
app.locals.database = dbconfig.db['database'];
app.locals.connectionerror = 'successful';
app.locals.databases = '';

var connection = mysql.createConnection({
    host: dbconfig.db['host'],
    user: dbconfig.db['username'],
    password: dbconfig.db['password'],
    port: dbconfig.db['port'],
    database: dbconfig.db['database']
});

connection.connect(function(err)
{
    if (err) {
        app.locals.connectionerror = err.stack;
        return;
    }
    console.log('connect to database');
});

var add_comment = function(comment, cb) {
    console.log('add_comment');
    var comment = {"date": new Date().toISOString(), "text": comment};
    connection.query('INSERT INTO comment SET ?', comment, function(err, result) {
      return cb(err, result);
    });
};

var get_comments = function(cb) {
    console.log('get_comments');
    return connection.query('SELECT * FROM comment', function(err, rows, fields) {
      if (err) {
        return cb(err);
      }
      return cb(null, (rows) ? rows : []);
    });  
};

app.use(function log (req, res, next) {
  console.log([req.method, req.url].join(' '));
  next();
});
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }))

app.set('view engine', 'jade');
app.get('/', function(req, res) {
    var comments = get_comments(function(err, data) {
      if (err) {
        console.log(err);
      } else {
        res.render("index",
               { agent: req.headers['user-agent'],
                 hostname: os.hostname(),
                 os: os.type(),
                 nodeversion: process.version,
                 time: new Date(),
                 admin: (process.env.APP_ADMIN_EMAIL || "justin@gomaji.com" ),
                 comments: data
               });    
      }
    });
});

app.post('/', function(req, res) {
    var comment = req.body.comment;
    if (comment) {
        console.log("Got comment: " + comment);
        add_comment(comment, function(err, data) {
          if (err) {
            console.log(err);
          }
          res.redirect("/#form-section");
        });
    }
});

var server = app.listen(process.env.PORT || 3000, function() {
    console.log('Listening on %s', process.env.PORT);
});
