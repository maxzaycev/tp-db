'use strict'

const forum = require('./forum');

module.exports.forum = forum;

const UrlApiExecutor = require('../class/url-api-executor');

const clear = new UrlApiExecutor((query)=>{
	return {'i`m':'clear'}
});

const status = new UrlApiExecutor((query)=>{
	return {'i`m':'status'}
});

module.exports.clear = clear;
module.exports.status = status;