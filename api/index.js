'use strict';

const db = require('../db');

module.exports.forum = require('./forum');
module.exports.user = require('./user');

const Executor = require('../class/executor');

const clear = new Executor(null, (query, body)=>{
	return new Promise((resolve) => {
		db.query('DELETE FROM users');
		db.query('DELETE FROM threads');
		db.query('DELETE FROM posts');
		db.query('DELETE FROM forums');

		resolve({"code": 0, "response": "OK"});
	});
});

const status = new Executor((query)=>{
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

}, null);

module.exports.clear = clear;
module.exports.status = status;