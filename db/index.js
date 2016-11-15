'use strict';
let mysql = require('mysql');
let config = require('./config');


let pool  = mysql.createPool(config);

module.exports = pool;