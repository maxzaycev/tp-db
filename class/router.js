'use strict';

const executors = {};
	executors['db'] = {};
	executors['db']['api'] = require('../api');

class Router{
	constructor(method, path, query){
		this.method = method;
		this.path = path;
		this.query = query;
	}

	getExecutor(){
		let executor = executors;
		let isFound = this.path.every((r)=>{
			if (r !== '')
				if (typeof executor[r] === 'object')
					executor = executor[r];
				else
					return false;
			return true;
		});

		return (isFound)?executor:null;
	}

	route(body){
		if(body)
			this.body = body;
		
		let executor = this.getExecutor();

			//Not found 404
		if (!executor)
			return {error: 404};

		if (typeof executor[this.method] === 'function')
			return {
				promise: executor[this.method](this.query, this.body),
				error: 0
			};
		else
				//Method not allowed 405
			return {error: 405}
	}
}

module.exports = Router;