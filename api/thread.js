const db = require('../db');
const Executor = require('../class/executor');

module.exports.details = new Executor((query)=>{
    if(!query.query.thread) {
        return (error_message(2));
    }
    db.query("SELECT * FROM threads WHERE id = ?;", query.query.thread, function(err, rows) {
        if(err || !rows.length) {
           ;//console.log(err);
            return (error_message(3));
        }
        let result = {code:0, response: clone_obj(rows[0])};
        if(query.query.related && query.query.related.length) {
            let add = {counter: 0};
            for (let i = 0; i < query.query.related.length; i++) {
                add[query.query.related[i]] = 1;
                add.counter++;
            }
            let query = "";
            if(add.user) {query = query + "SELECT * FROM users WHERE email = '" + result.response.user + "'; "; add.counter--;}
            if(add.forum) {query = query + "SELECT * FROM forums WHERE short_name = '" + result.response.forum + "';"; add.counter--;}
            if(add.counter) {
                return (error_message(3));
            } else {
                return (JSON.stringify(result));
            }
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    return (error_message(3));
                }
                if(add.user) {
                    result.response.user = rows[0];
                    if(add.forum) result.response.forum = rows[1];
                } else {
                    result.response.forum = rows[0];
                }
                return (JSON.stringify(result));
            });
        } else {
            return (JSON.stringify(result));
        }

    });
};

module.exports.list = new Executor((query)=>{
    if(!query.query.user && !query.query.forum) {
        return (error_message(3));
    }
    let query = "SELECT * FROM threads WHERE ";
    if(query.query.user) {
        query += "user = '" + query.query.user + "'";
    } else {
        query += "forum = '" + query.query.forum + "'";
    }
    if(query.query.since) {
        query += " AND date > '" + query.query.since +"'";
    }
    query += " ORDER BY date";
    if(query.query.order != "asc") {
        query += " DESC";
    }
    if(query.query.limit) {
        query += " LIMIT " + query.query.limit;
    }
    query += ";";
    db.query(query, function(err, rows) {
        if(err) {
            return (error_message(3));
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listPosts = new Executor((query)=>{
    if(!query.query.thread) {
        return (error_message(3));
    }
    let query = "";
    if(!query.query.sort || query.query.sort == "flat") {
        query = "SELECT * FROM posts WHERE thread = " + query.query.thread;
        if(query.query.since) {
            query += " AND date > '" + query.query.since +"'";
        }
        query += " ORDER BY date";
        if(query.query.order != "asc")
            query += " DESC";
        if(query.query.limit)
            query += " LIMIT " + query.query.limit;
    }
    if(query.query.sort && query.query.sort == "tree") {
        query = "SELECT mpath + 0 AS main, p.* FROM posts p WHERE thread = " + query.query.thread;
        if(query.query.since)
            query += " AND date > '" + query.query.since +"'";
        query += " ORDER BY 1";
        if(query.query.order != "asc")
            query += " DESC";
        query += ", mpath ";
        query +=", date";
        if(query.query.limit)
            query += " LIMIT " + query.query.limit;
    }
    if(query != "") {
        db.query(query, function(err, rows) {
            if(err) {
                return (error_message(3));
            }
            for(let i = 0; i < rows.length; i++) {
                rows[i].isApproved = !!rows[i].isApproved;
                rows[i].isHighlighted = !!rows[i].isHighlighted;
                rows[i].isEdited = !!rows[i].isEdited;
                rows[i].isSpam = !!rows[i].isSpam;
                rows[i].isDeleted = !!rows[i].isDeleted;
            }
            return (JSON.stringify({code:0, response: rows}));
        });
    }
    if(query.query.sort && query.query.sort == "parent_tree") {
        query = "SELECT mpath + 0 AS main, p.* FROM posts p WHERE thread = " + query.query.thread;
        let subquery = "SELECT mpath + 0 AS main FROM posts WHERE thread = " + query.query.thread;
        if(query.query.since)
            subquery += " AND date > '" + query.query.since + "'";
        subquery += " GROUP BY 1 ORDER BY 1";
        if(query.query.order != "asc")
            subquery += " DESC";
        if(query.query.limit)
            subquery += " LIMIT " + query.query.limit;
        db.query(subquery, function(err, rows) {
            if(err) {
               ;//console.log(err);
                return;
            }
            subquery = "-1";
            for(let i = 0; i < rows.length; i++)
                subquery += ", " + rows[i].main;
            query += " AND (mpath + 0) IN (" + subquery + ") ORDER BY 1, mpath, date;";
            db.query(query, function(err, rows) {
                if(err) {
                    return (error_message(3));
                }
                return (JSON.stringify({code:0, response: rows}));
            });
        });
    }
};


module.exports.create = new Executor(null, (query, body)=>{
    db.query("INSERT INTO threads SET ?;", query.body, function(err, rows) {
        if(err) {
            return (error_message(3));
        }
        if(query.body.isDeleted) {} else {query.body.isDeleted = false;}
        query.body.id = rows.insertId;
        let result = {code: 0, response: query.body};
        return (JSON.stringify(result));
    });
};

module.exports.remove = new Executor(null, (query, body)=>{
    let query = "UPDATE threads SET isDeleted = true, posts = 0 WHERE id = " + query.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
        }
        query = "UPDATE posts SET isDeleted = true WHERE thread = " + query.body.thread + ";";
        db.query(query, function(err, rows) {
            return (JSON.stringify({code: 0, response: {thread: query.body.thread}}));
        });
    });
};

module.exports.restore = new Executor(null, (query, body)=>{
    let query = "UPDATE posts SET isDeleted = false WHERE thread = " + query.body.thread + ";";
    db.query(query, function(err, rows) {
        query = "UPDATE threads SET isDeleted = false, posts = " + rows.affectedRows + " WHERE id = " + query.body.thread + ";";
        db.query(query, function(err, rows) {
            if(err || !rows.affectedRows) {
                return (error_message(1));
            }
            return (JSON.stringify({code: 0, response: {thread: query.body.thread}}));
        });
    });
};

module.exports.close = new Executor(null, (query, body)=>{
    let query = "UPDATE threads SET isClosed = true WHERE id = " + query.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
        }
        return (JSON.stringify({code: 0, response: {thread: query.body.thread}}));
    });
};

module.exports.open = new Executor(null, (query, body)=> {
    let query = "UPDATE threads SET isClosed = false WHERE id = " + query.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
        }
        return (JSON.stringify({code: 0, response: {thread: query.body.thread}}));
    });
};

module.exports.update = new Executor(null, (query, body)=>{
    if(!query.body.message || !query.body.slug || !query.body.thread) {
        return (error_message(3));
        return;
    }
    let query = "UPDATE threads SET message = '" + query.body.message + "', slug = '" + query.body.slug + "' WHERE id = " + query.body.thread;
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
            return;
        }
        db.query("SELECT * FROM threads WHERE id = ?;", query.body.thread, function(err, rows) {
            if(err) {
                return (error_message(4));
               ;//console.log(err);
                return;
            }
            let result = {code: 0, response: rows[0]};
            return (JSON.stringify(result));
        });
    });
};

module.exports.vote = new Executor(null, (query, body)=>{
    if(!query.body.vote || !query.body.thread) {
        return (error_message(3));
        return;
    }
    let like = query.body.vote == 1?"likes":"dislikes";
    let query = "UPDATE threads SET " + like + " = " + like + " + 1, points = points " +
        (query.body.vote == 1?"+":"-") +" 1 WHERE id = " + query.body.thread;
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
            return;
        }
        db.query("SELECT * FROM threads WHERE id = ?;", query.body.thread, function(err, rows) {
            if(err) {
                return (error_message(4));
               ;//console.log(err);
                return;
            }
            let result = {code: 0, response: rows[0]};
            return (JSON.stringify(result));
        });
    });
};

module.exports.subscribe = new Executor(null, (query, body)=>{
    let replace = {users_email:query.body.user, threads_id:query.body.thread};
    db.query("INSERT INTO subscriptions SET ?", replace, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(3));
           ;//console.log(err);
            return;
        }
        return (JSON.stringify({code:0, response:query.body}));
    });
};

module.exports.unsubscribe = new Executor(null, (query, body)=> {
    let query = "DELETE FROM subscriptions WHERE users_email = '" + query.body.user + "' AND threads_id = " + query.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
           ;//console.log(err);
            return;
        }
        return (JSON.stringify({code:0, response:query.body}));
    });
};