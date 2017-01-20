const db = require('../db');
const Executor = require('../class/executor');

module.exports.list = new Executor((query)=>{
    if (!req.query.forum && !req.query.thread) {
        res.end(error_message(3));
        return;
    }
    var query = "SELECT * FROM posts WHERE " + (req.query.forum? "forum='" + req.query.forum: "thread='" + req.query.thread) + "' ";
    if (req.query.since) {
        query = query + "AND date >= '" + req.query.since + "' ";
    }
    if (req.query.order == "asc") {
        query = query + "ORDER BY date ";
    } else {
        query = query + "ORDER BY date DESC ";
    }
    if (req.query.limit) {
        query = query + "LIMIT " + req.query.limit;
    }
    query = query + ";";
    db.query(query, function(err, row) {
        if(err) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        for(var i = 0; i < row.length; i++) {
            row[i].isApproved = !!row[i].isApproved;
            row[i].isHighlighted = !!row[i].isHighlighted;
            row[i].isDeleted = !!row[i].isDeleted;
            row[i].isEdited = !!row[i].isEdited;
            date = JSON.stringify(row[i].date);
            row[i].date = date.substr(1,10) + " " + date.substr(12,8);
        }
        res.end(JSON.stringify({code: 0, response: row}));
    });
};

module.exports.details = new Executor((query)=>{
    if(!req.query.post) {
        res.end(error_message(2));
        return;
    }
    db.query("SELECT * FROM posts WHERE id = ?;", req.query.post, function(err, rows) {
        if(err || !rows.length) {
           ;//console.log(err);
            res.end(error_message(1));
            return;
        }
        var answ = {code:0, response: clone_obj(rows[0])};
        res.end(JSON.stringify(answ));
    });
};

module.exports.create = new Executor(null, (query, body)=>{
    db.query("INSERT INTO posts SET ?", req.body, function(err, row) {
        if (err) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        var id = row.insertId;
        if(!req.body.parent) {
            var query = "UPDATE posts SET mpath = '" + id + "' WHERE id = " + id + ";";
            var lol = db.query(query, function(err) {
                if(err)
                   ;//console.log(err);
            });
        } else {
            var query = "UPDATE posts SET mpath = CONCAT(mpath, '\\\\', " + id + ") WHERE id = " + id + ";";
            var lol = db.query(query, function(err) {
                if(err)
                   ;//console.log(err);
            });
        }
        db.query("SELECT * FROM posts WHERE id = ?;", id, function(err, row) {
            if(err) {
               ;//console.log(err);
                res.end(error_message(4));
                return;
            }
            var answ = {code: 0, response: row[0]};
            res.end(JSON.stringify(answ));
        });

    });
};

module.exports.remove = new Executor(null, (query, body)=>{
    if (!req.body.post) {
        res.end(error_message(2));
        return;
    }
    db.query("UPDATE posts SET isDeleted = 1 WHERE id = ?;", req.body.post, function(err, row) {
        if(err) {
           ;//console.log(err);
            res.end(error_message(5));
            return;
        }
        if(!row.affectedRows) {
            res.end(error_message(1));
            return;
        }
        var answ = {code:0, response: {post : req.body.post}};
        res.end(JSON.stringify(answ));
        db.query("UPDATE threads SET posts = posts - 1 WHERE id = (SELECT thread FROM posts WHERE id = ?);", req.body.post, function(err){});
    });
};

module.exports.restore = new Executor(null, (query, body)=> {
    if (!req.body.post) {
        res.end(error_message(2));
        return;
    }
    db.query("UPDATE posts SET isDeleted = 0 WHERE id = ?;", req.body.post, function(err, row) {
        if(err) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        if(!row.affectedRows) {
            res.end(error_message(1));
            return;
        }
        var answ = {code:0, response: {post : req.body.post}};
        res.end(JSON.stringify(answ));
        db.query("UPDATE threads SET posts = posts + 1 WHERE id = (SELECT thread FROM posts WHERE id = ?);", req.body.post, function(err){});
    });
};

module.exports.update = new Executor(null, (query, body)=>{
    if (!req.body.post || !req.body.message) {
        res.end(error_message(2));
        return;
    }
    var instead = [req.body.message, req.body.post];
    db.query("UPDATE posts SET message = ? WHERE id = ?;", instead, function(err, row) {
        if(err) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        if(!row.affectedRows) {
            res.end(error_message(1));
            return;
        }
        db.query("SELECT * FROM posts WHERE id = ?;", req.body.post, function(err, row) {
            row[0].isApproved = !!row[0].isApproved;
            row[0].isHighlighted = !!row[0].isHighlighted;
            row[0].isDeleted = !!row[0].isDeleted;
            row[0].isEdited = !!row[0].isEdited;
            date = JSON.stringify(row[0].date);
            row[0].date = date.substr(1,10) + " " + date.substr(12,8);
            var answ = {code: 0, response: row[0]};
            res.end(JSON.stringify(answ));
        });
    });
};

module.exports.vote = new Executor(null, (query, body)=>{
    if (!req.body.post || !(req.body.vote == 1 || req.body.vote == -1)) {
        res.end(error_message(2));
        return;
    }
    var like = req.body.vote == 1?"likes":"dislikes";
    var query = "UPDATE posts SET " + like + " = " + like + " + 1, points = points " + (req.body.vote == 1?"+":"-") +" 1 WHERE id = " + req.body.post;
    db.query(query, function(err, row) {
        if(err) {
           ;//console.log(err);
            res.end(error_message(3));
            return;
        }
        if(!row.affectedRows) {
            res.end(error_message(1));
            return;
        }
        db.query("SELECT * FROM posts WHERE id = ?;", req.body.post, function(err, row) {
            row[0].isApproved = !!row[0].isApproved;
            row[0].isHighlighted = !!row[0].isHighlighted;
            row[0].isDeleted = !!row[0].isDeleted;
            row[0].isEdited = !!row[0].isEdited;
            date = JSON.stringify(row[0].date);
            row[0].date = date.substr(1,10) + " " + date.substr(12,8);
            var answ = {code: 0, response: row[0]};
            res.end(JSON.stringify(answ));
        });
    });
};