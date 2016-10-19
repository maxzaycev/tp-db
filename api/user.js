'use strict'

const UrlApiExecutor = require('../class/url-api-executor');

const create = new UrlApiExecutor((query)=>{
	return {'i`m':'create user'}
});

const show = new UrlApiExecutor((query)=>{
	return {'i`m':'show user'}
});

module.exports.create = create;
module.exports.show = show;