const db = require('../db');
const Executor = require('../class/executor');

module.exports.forum = require('./forum');
module.exports.user = require('./user');
module.exports.thread = require('./thread');
module.exports.post = require('./post');

const clear = function *(null, (query, body)=>{
	return new Promise((resolve) => {
		db.query('truncate table users');
		db.query('truncate table threads');
		db.query('truncate table posts');
		db.query('truncate table forums');

		yield {"code": 0, "response": "OK"};
	});
};

const status = function *((query)=>{
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

}, null;

module.exports.clear = clear;
module.exports.status = status;
