'use strict';
var mysql = require('mysql');

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        :  process.env.PW,
  database        : 'mydb'
});

module.exports = pool;