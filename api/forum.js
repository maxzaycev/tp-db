'use strict';

const Executor = require('../class/executor');

const create = new Executor((query)=>{
	return {'im':'create forum'}
});

const show = new Executor((query)=>{
	return {'im':'show forum'}
});

module.exports.create = create;
module.exports.show = show;