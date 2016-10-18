'use strict'
var mysql = require('mysql');

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : 'xZtD4Egw',
  database        : 'tp'
});

module.exports = pool;