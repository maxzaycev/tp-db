'use strict';

const Executor = require('../class/executor');

const create = new Executor((query)=>{
	return {'i`m':'create user'}
});

const show = new Executor((query)=>{
	return {'i`m':'show user'}
});

module.exports.create = create;
module.exports.show = show;