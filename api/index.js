'use strict';

const db = require('../db');

module.exports.forum = require('./forum');
module.exports.user = require('./user');

const Executor = require('../class/executor');

const clear = new Executor(null, (query, body)=>{
	return new Promise((resolve) => {
		db.query('truncate table users');
		db.query('truncate table threads');
		db.query('truncate table posts');
		db.query('truncate table forums');

		resolve({"code": 0, "response": "OK"});
	});
});

const status = new Executor((query)=>{
	return new Promise((resolve) => {
		db.query(`select
					count(u.id) AS user,
					count(p.isDeleted) AS post,
					count(t.isDeleted) AS thread,
					count(f.id) AS forum
				from
					users AS u,
					posts AS p,
					threads AS t,
					forums AS f`, (err, rows)=>{ resolve(rows[0]) });
	});

}, null);

module.exports.clear = clear;
module.exports.status = status;
