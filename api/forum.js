'use strict'

const UrlApiExecutor = require('../class/url-api-executor');

const create = new UrlApiExecutor((query)=>{
	return {'i`m':'create forum'}
});

const show = new UrlApiExecutor((query)=>{
	return {'i`m':'show forum'}
});

module.exports.create = create;
module.exports.show = show;