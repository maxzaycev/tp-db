'use strict'

const db = require('../db');

const forum = require('./forum');

module.exports.forum = forum;

const UrlApiExecutor = require('../class/url-api-executor');

const clear = new UrlApiExecutor(null, (query, body)=>{
	return {code: 0, response: "OK"}
});

const status = new UrlApiExecutor((query)=>{
	return {
		"code": 0, 
		"response": {
			"user": 100000, 
			"thread": 1000,
			"forum": 100,
			"post": 1000000
			}
		}
}, null);

module.exports.clear = clear;
module.exports.status = status;