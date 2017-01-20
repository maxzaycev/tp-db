const db = require('../db');
const Executor = require('../class/executor');

module.exports.list = new Executor((query)=>{
    if (!query.query.forum && !query.query.thread) {
        return (error_message(3));
    }
    let query = "SELECT * FROM posts WHERE " + (query.query.forum? "forum='" + query.query.forum: "thread='" + query.query.thread) + "' ";
    if (query.query.since) {
        query = query + "AND date >= '" + query.query.since + "' ";
    }
    if (query.query.order == "asc") {
        query = query + "ORDER BY date ";
    } else {
        query = query + "ORDER BY date DESC ";
    }
    if (query.query.limit) {
        query = query + "LIMIT " + query.query.limit;
    }
    query = query + ";";
    db.query(query, function(err, row) {
        if(err) {
           ;//console.log(err);
            return (error_message(3));
        }
        for(let i = 0; i < row.length; i++) {
            row[i].isApproved = !!row[i].isApproved;
            row[i].isHighlighted = !!row[i].isHighlighted;
            row[i].isDeleted = !!row[i].isDeleted;
            row[i].isEdited = !!row[i].isEdited;
            date = JSON.stringify(row[i].date);
            row[i].date = date.substr(1,10) + " " + date.substr(12,8);
        }
        return (JSON.stringify({code: 0, response: row}));
    });
};

module.exports.details = new Executor((query)=>{
    if(!query.query.post) {
        return (error_message(2));
        return;
    }
    db.query("SELECT * FROM posts WHERE id = ?;", query.query.post, function(err, rows) {
        if(err || !rows.length) {
           ;//console.log(err);
            return (error_message(1));
        }
        let result = {code:0, response: clone_obj(rows[0])};
        return (JSON.stringify(result));
    });
};

module.exports.create = new Executor(null, (query, body)=>{
    db.query("INSERT INTO posts SET ?", query.body, function(err, row) {
        if (err) {
           ;//console.log(err);
            return (error_message(3));
        }
        let id = row.insertId;
        if(!query.body.parent) {
            let query = "UPDATE posts SET mpath = '" + id + "' WHERE id = " + id + ";";
            let lol = db.query(query, function(err) {
                if(err)
                   ;//console.log(err);
            });
        } else {
            let query = "UPDATE posts SET mpath = CONCAT(mpath, '\\\\', " + id + ") WHERE id = " + id + ";";
            let lol = db.query(query, function(err) {
                if(err)
                   ;//console.log(err);
            });
        }
        db.query("SELECT * FROM posts WHERE id = ?;", id, function(err, row) {
            if(err) {
               ;//console.log(err);
                return (error_message(4));
            }
            let result = {code: 0, response: row[0]};
            return (JSON.stringify(result));
        });

    });
};

module.exports.remove = new Executor(null, (query, body)=>{
    if (!query.body.post) {
        return (error_message(2));
    }
    db.query("UPDATE posts SET isDeleted = 1 WHERE id = ?;", query.body.post, function(err, row) {
        if(err) {
           ;//console.log(err);
            return (error_message(5));
        }
        if(!row.affectedRows) {
            return (error_message(1));
        }
        let result = {code:0, response: {post : query.body.post}};
        return (JSON.stringify(result));
        db.query("UPDATE threads SET posts = posts - 1 WHERE id = (SELECT thread FROM posts WHERE id = ?);", query.body.post, function(err){});
    });
};

module.exports.restore = new Executor(null, (query, body)=> {
    if (!query.body.post) {
        return (error_message(2));
    }
    db.query("UPDATE posts SET isDeleted = 0 WHERE id = ?;", query.body.post, function(err, row) {
        if(err) {
           ;//console.log(err);
            return (error_message(3));
        }
        if(!row.affectedRows) {
            return (error_message(1));
        }
        let result = {code:0, response: {post : query.body.post}};
        return (JSON.stringify(result));
        db.query("UPDATE threads SET posts = posts + 1 WHERE id = (SELECT thread FROM posts WHERE id = ?);", query.body.post, function(err){});
    });
};

module.exports.update = new Executor(null, (query, body)=>{
    if (!query.body.post || !query.body.message) {
        return (error_message(2));
    }
    let instead = [query.body.message, query.body.post];
    db.query("UPDATE posts SET message = ? WHERE id = ?;", instead, function(err, row) {
        if(err) {
           ;//console.log(err);
            return (error_message(3));
        }
        if(!row.affectedRows) {
            return (error_message(1));
        }
        db.query("SELECT * FROM posts WHERE id = ?;", query.body.post, function(err, row) {
            row[0].isApproved = !!row[0].isApproved;
            row[0].isHighlighted = !!row[0].isHighlighted;
            row[0].isDeleted = !!row[0].isDeleted;
            row[0].isEdited = !!row[0].isEdited;
            date = JSON.stringify(row[0].date);
            row[0].date = date.substr(1,10) + " " + date.substr(12,8);
            let result = {code: 0, response: row[0]};
            return (JSON.stringify(result));
        });
    });
};

module.exports.vote = new Executor(null, (query, body)=>{
    if (!query.body.post || !(query.body.vote == 1 || query.body.vote == -1)) {
        return (error_message(2));
    }
    let like = query.body.vote == 1?"likes":"dislikes";
    let query = "UPDATE posts SET " + like + " = " + like + " + 1, points = points " + (query.body.vote == 1?"+":"-") +" 1 WHERE id = " + query.body.post;
    db.query(query, function(err, row) {
        if(err) {
           ;//console.log(err);
            return (error_message(3));
        }
        if(!row.affectedRows) {
            return (error_message(1));
        }
        db.query("SELECT * FROM posts WHERE id = ?;", query.body.post, function(err, row) {
            row[0].isApproved = !!row[0].isApproved;
            row[0].isHighlighted = !!row[0].isHighlighted;
            row[0].isDeleted = !!row[0].isDeleted;
            row[0].isEdited = !!row[0].isEdited;
            date = JSON.stringify(row[0].date);
            row[0].date = date.substr(1,10) + " " + date.substr(12,8);
            let result = {code: 0, response: row[0]};
            return (JSON.stringify(result));
        });
    });
};