const db = require('../db');
const Executor = require('../class/executor');

module.exports.forum = require('./forum');
module.exports.user = require('./user');
module.exports.thread = require('./thread');
module.exports.post = require('./post');

module.exports.clear = new Executor(null, (query, body)=>{
	return new Promise((resolve) => {
		db.query('TRUNCATE TABLE users');
		db.query('TRUNCATE TABLE threads');
		db.query('TRUNCATE TABLE posts');
		db.query('TRUNCATE TABLE forums');

		return {"code": 0, "response": "OK"};
	});
};

module.exports.status = new Executor((query)=>{
	return new Promise((resolve) => {
		db.query(`SELECT
					COUNT(u.id) AS user,
					COUNT(p.isDeleted) AS post,
					COUNT(t.isDeleted) AS thread,
					COUNT(f.id) AS forum
				FROM
					users AS u,
					posts AS p,
					threads AS t,
					forums AS f`, (err, rows)=>{ resolve(rows[0]) });
	});

}, null;
