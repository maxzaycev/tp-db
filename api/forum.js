'use strict'

const UrlApiExecutor = require('../class/url-api-executor');

const create = new UrlApiExecutor((query)=>{
	return {'im':'create forum'}
});

const show = new UrlApiExecutor((query)=>{
	return {'im':'show forum'}
});

module.exports.create = create;
module.exports.show = show;