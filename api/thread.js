const db = require('../db');
const Executor = require('../class/executor');

module.exports.details = new Executor((query)=>{
    if(!req.query.thread) {
        res.end(error_message(2));
        return;
    }
    db.query("SELECT * FROM threads WHERE id = ?;", req.query.thread, function(err, rows) {
        if(err || !rows.length) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        var answ = {code:0, response: clone_obj(rows[0])};
        if(req.query.related && req.query.related.length) {
            var add = {counter: 0};
            for (var i = 0; i < req.query.related.length; i++) {
                add[req.query.related[i]] = 1;
                add.counter++;
            }
            var query = "";
            if(add.user) {query = query + "SELECT * FROM users WHERE email = '" + answ.response.user + "'; "; add.counter--;}
            if(add.forum) {query = query + "SELECT * FROM forums WHERE short_name = '" + answ.response.forum + "';"; add.counter--;}
            if(add.counter) {
                res.end(error_message(3));
                return;
            } else {
                res.end(JSON.stringify(answ));
                return;
            }
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    res.end(error_message(3));
                    return;
                }
                if(add.user) {
                    answ.response.user = rows[0];
                    if(add.forum) answ.response.forum = rows[1];
                } else {
                    answ.response.forum = rows[0];
                }
                res.end(JSON.stringify(answ));
            });
        } else {
            res.end(JSON.stringify(answ));
        }

    });
};

module.exports.list = new Executor((query)=>{
    if(!req.query.user && !req.query.forum) {
        res.end(error_message(3));
        return;
    }
    var query = "SELECT * FROM threads WHERE ";
    if(req.query.user) {
        query += "user = '" + req.query.user + "'";
    } else {
        query += "forum = '" + req.query.forum + "'";
    }
    if(req.query.since) {
        query += " AND date > '" + req.query.since +"'";
    }
    query += " ORDER BY date";
    if(req.query.order != "asc") {
        query += " DESC";
    }
    if(req.query.limit) {
        query += " LIMIT " + req.query.limit;
    }
    query += ";";
    db.query(query, function(err, rows) {
        if(err) {
            res.end(error_message(3));
           ;//console.log(err);
            return;
        }
        res.end(JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listPosts = new Executor((query)=>{
    if(!req.query.thread) {
        res.end(error_message(3));
        return;
    }
    var query = "";
    if(!req.query.sort || req.query.sort == "flat") {
        query = "SELECT * FROM posts WHERE thread = " + req.query.thread;
        if(req.query.since) {
            query += " AND date > '" + req.query.since +"'";
        }
        query += " ORDER BY date";
        if(req.query.order != "asc")
            query += " DESC";
        if(req.query.limit)
            query += " LIMIT " + req.query.limit;
    }
    if(req.query.sort && req.query.sort == "tree") {
        query = "SELECT mpath + 0 AS main, p.* FROM posts p WHERE thread = " + req.query.thread;
        if(req.query.since)
            query += " AND date > '" + req.query.since +"'";
        query += " ORDER BY 1";
        if(req.query.order != "asc")
            query += " DESC";
        query += ", mpath ";
        query +=", date";
        if(req.query.limit)
            query += " LIMIT " + req.query.limit;
    }
    if(query != "") {
        db.query(query, function(err, rows) {
            if(err) {
                res.end(error_message(3));
               ;//console.log(err);
                return;
            }
            for(var i = 0; i < rows.length; i++) {
                rows[i].isApproved = !!rows[i].isApproved;
                rows[i].isHighlighted = !!rows[i].isHighlighted;
                rows[i].isEdited = !!rows[i].isEdited;
                rows[i].isSpam = !!rows[i].isSpam;
                rows[i].isDeleted = !!rows[i].isDeleted;
            }
            res.end(JSON.stringify({code:0, response: rows}));
        });
    }
    if(req.query.sort && req.query.sort == "parent_tree") {
        query = "SELECT mpath + 0 AS main, p.* FROM posts p WHERE thread = " + req.query.thread;
        var subquery = "SELECT mpath + 0 AS main FROM posts WHERE thread = " + req.query.thread;
        if(req.query.since)
            subquery += " AND date > '" + req.query.since + "'";
        subquery += " GROUP BY 1 ORDER BY 1";
        if(req.query.order != "asc")
            subquery += " DESC";
        if(req.query.limit)
            subquery += " LIMIT " + req.query.limit;
        db.query(subquery, function(err, rows) {
            if(err) {
               ;//console.log(err);
                return;
            }
            subquery = "-1";
            for(var i = 0; i < rows.length; i++)
                subquery += ", " + rows[i].main;
            query += " AND (mpath + 0) IN (" + subquery + ") ORDER BY 1, mpath, date;";
            db.query(query, function(err, rows) {
                if(err) {
                    res.end(error_message(3));
                   ;//console.log(err);
                    return;
                }
                res.end(JSON.stringify({code:0, response: rows}));
            });
        });
    }
};


module.exports.create = new Executor(null, (query, body)=>{
    db.query("INSERT INTO threads SET ?;", req.body, function(err, rows) {
        if(err) {
            res.end(error_message(3));
           ;//console.log("thread_post" + err);
            return;
        }
        if(req.body.isDeleted) {} else {req.body.isDeleted = false;}
        req.body.id = rows.insertId;
        var answ = {code: 0, response: req.body};
        res.end(JSON.stringify(answ));
    });
};

module.exports.remove = new Executor(null, (query, body)=>{
    var query = "UPDATE threads SET isDeleted = true, posts = 0 WHERE id = " + req.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        query = "UPDATE posts SET isDeleted = true WHERE thread = " + req.body.thread + ";";
        db.query(query, function(err, rows) {
            res.end(JSON.stringify({code: 0, response: {thread: req.body.thread}}));
        });
    });
};

module.exports.restore = new Executor(null, (query, body)=>{
    var query = "UPDATE posts SET isDeleted = false WHERE thread = " + req.body.thread + ";";
    db.query(query, function(err, rows) {
        query = "UPDATE threads SET isDeleted = false, posts = " + rows.affectedRows + " WHERE id = " + req.body.thread + ";";
        db.query(query, function(err, rows) {
            if(err || !rows.affectedRows) {
                res.end(error_message(1));
                return;
            }
            res.end(JSON.stringify({code: 0, response: {thread: req.body.thread}}));
        });
    });
};

module.exports.close = new Executor(null, (query, body)=>{
    var query = "UPDATE threads SET isClosed = true WHERE id = " + req.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        res.end(JSON.stringify({code: 0, response: {thread: req.body.thread}}));
    });
};

module.exports.open = new Executor(null, (query, body)=> {
    var query = "UPDATE threads SET isClosed = false WHERE id = " + req.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        res.end(JSON.stringify({code: 0, response: {thread: req.body.thread}}));
    });
};

module.exports.update = new Executor(null, (query, body)=>{
    if(!req.body.message || !req.body.slug || !req.body.thread) {
        res.end(error_message(3));
        return;
    }
    var query = "UPDATE threads SET message = '" + req.body.message + "', slug = '" + req.body.slug + "' WHERE id = " + req.body.thread;
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        db.query("SELECT * FROM threads WHERE id = ?;", req.body.thread, function(err, rows) {
            if(err) {
                res.end(error_message(4));
               ;//console.log(err);
                return;
            }
            var answ = {code: 0, response: rows[0]};
            res.end(JSON.stringify(answ));
        });
    });
};

module.exports.vote = new Executor(null, (query, body)=>{
    if(!req.body.vote || !req.body.thread) {
        res.end(error_message(3));
        return;
    }
    var like = req.body.vote == 1?"likes":"dislikes";
    var query = "UPDATE threads SET " + like + " = " + like + " + 1, points = points " +
        (req.body.vote == 1?"+":"-") +" 1 WHERE id = " + req.body.thread;
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        db.query("SELECT * FROM threads WHERE id = ?;", req.body.thread, function(err, rows) {
            if(err) {
                res.end(error_message(4));
               ;//console.log(err);
                return;
            }
            var answ = {code: 0, response: rows[0]};
            res.end(JSON.stringify(answ));
        });
    });
};

module.exports.subscribe = new Executor(null, (query, body)=>{
    var replace = {users_email:req.body.user, threads_id:req.body.thread};
    db.query("INSERT INTO subscriptions SET ?", replace, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(3));
           ;//console.log(err);
            return;
        }
        res.end(JSON.stringify({code:0, response:req.body}));
    });
};

module.exports.unsubscribe = new Executor(null, (query, body)=> {
    var query = "DELETE FROM subscriptions WHERE users_email = '" + req.body.user + "' AND threads_id = " + req.body.thread + ";";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
           ;//console.log(err);
            return;
        }
        res.end(JSON.stringify({code:0, response:req.body}));
    });
};