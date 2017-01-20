const db = require('../db');
const Executor = require('../class/executor');

module.exports.details = function(req, res) {
    if(!req.query.user) {
        res.end(error_message(2));
        return;
    }
    db.query("SELECT * FROM users WHERE email = ?;", req.query.user, function(err, rows) {
        if(err) {
           //console.log(err);
            res.end(error_message(1));
            return;
        }
        var answ = {code:0, response: clone_obj(rows[0])};
        answ.response.followers = [];
        answ.response.following = [];
        answ.response.subscriptions = [];
        var query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + req.query.user +
        "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + req.query.user +
        "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + req.query.user + "');";
        db.query(query, function(err, rows) {
            if(err) {
               //console.log(err);
                res.end(error_message(4));
                return;
            }
            for(var i = 0; i < rows.length; i++) {
                if(rows[i].ind == 0) answ.response.following.push(rows[i].value);
                if(rows[i].ind == 1) answ.response.followers.push(rows[i].value);
                if(rows[i].ind == 2) answ.response.subscriptions.push(+rows[i].value);
            }
            res.end(JSON.stringify(answ));
        });
    });
};

module.exports.listPosts = function(req, res) {
    var query = "SELECT * FROM posts WHERE user = '" + req.query.user + "' ";
    if(req.query.since)
        query += "AND date > '" + req.query.since + "' ";
    query += "ORDER BY date ";
    if(!req.query.order || req.query.order != "asc")
        query += "DESC ";
    if(req.query.limit)
        query += "LIMIT " + req.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        if(err) {
            res.end(error_message(3));
            //console.log(err);
            return;
        }
        if(!rows.length) {
            res.end(error_message(1));
            return;
        }
        res.end(JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listFollowers = function(req, res) {
    var query = "SELECT about, email, GROUP_CONCAT(DISTINCT f2.users_email_follower) AS followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS following, " +
        "id, isAnonymous, name, GROUP_CONCAT(DISTINCT s.threads_id) AS subscriptions, username " +
        "FROM followers f1 JOIN users u ON u.email = f1.users_email_follower " +
        "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
        "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
        "LEFT JOIN subscriptions s ON u.email = s.users_email " +
        "WHERE f1.users_email_following = '" + req.query.user + "' ";
    if(req.query.since_id)
        query += "AND id >= " + req.query.since_id;
    query += " GROUP BY email ORDER BY name ";
    if(req.query.order != "asc")
        query += "DESC ";
    if(req.query.limit)
        query += "LIMIT " + req.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        for(var i = 0; i < rows.length; i++) {
            if(rows[i].followers) rows[i].followers = rows[i].followers.split(',');
            else rows[i].followers = [];
            if(rows[i].following) rows[i].following = rows[i].following.split(',');
            else rows[i].following = [];
            if(rows[i].subscriptions) rows[i].subscriptions = rows[i].subscriptions.split(',');
            else rows[i].subscriptions = [];
            for(var j = 0; j < rows[i].subscriptions.length; j++)
                rows[i].subscriptions[j] = +rows[i].subscriptions[j];
        }
        res.end(JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listFollowing = function(req, res) {
    var query = "SELECT about, email, GROUP_CONCAT(DISTINCT f2.users_email_follower) AS followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS following, " +
        "id, isAnonymous, name, GROUP_CONCAT(DISTINCT s.threads_id) AS subscriptions, username " +
        "FROM followers f1 JOIN users u ON u.email = f1.users_email_following " +
        "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
        "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
        "LEFT JOIN subscriptions s ON u.email = s.users_email " +
        "WHERE f1.users_email_follower = '" + req.query.user + "' ";
    if(req.query.since_id)
        query += "AND id >= " + req.query.since_id;
    query += " GROUP BY email ORDER BY name ";
    if(req.query.order != "asc")
        query += "DESC ";
    if(req.query.limit)
        query += "LIMIT " + req.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        for(var i = 0; i < rows.length; i++) {
            if(rows[i].followers) rows[i].followers = rows[i].followers.split(',');
            else rows[i].followers = [];
            if(rows[i].following) rows[i].following = rows[i].following.split(',');
            else rows[i].following = [];
            if(rows[i].subscriptions) rows[i].subscriptions = rows[i].subscriptions.split(',');
            else rows[i].subscriptions = [];
            for(var j = 0; j < rows[i].subscriptions.length; j++)
                rows[i].subscriptions[j] = +rows[i].subscriptions[j];
        }
        res.end(JSON.stringify({code:0, response: rows}));
    });
};

module.exports.create = function(req, res) {
    db.query("INSERT INTO users SET ?;", req.body, function(err, rows) {
        if(err) {
            res.end(error_message(5));
            //console.log(err);
            return;
        }
        if(req.body.isAnonymous) {} else req.body.isAnonymous = false;
        req.body.id = rows.insertId;
        var answ = {code: 0, response: req.body};
        res.end(JSON.stringify(answ));
    });
};

module.exports.update = function(req, res) {
    if(!req.body.about || !req.body.user || !req.body.name) {
        res.end(error_message(3));
        return;
    }
    var query = "UPDATE users SET about = '" + req.body.about + "', name = '" + req.body.name + "' WHERE email = '" + req.body.user + "';";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            res.end(error_message(1));
            return;
        }
        db.query("SELECT * FROM users WHERE email = ?;", req.body.user, function(err, rows) {
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

module.exports.follow = function(req, res) {
    if(!req.body.follower || !req.body.followee) {
        res.end(error_message(3));
        return;
    }
    var query = "INSERT INTO followers VALUES('" + req.body.followee + "','" + req.body.follower +"');";
    db.query(query, function(err, rows) {
        db.query("SELECT * FROM users WHERE email = ?;", req.body.followee, function(err, rows) {
            if(err) {
               ;//console.log(err);
                res.end(error_message(1));
                return;
            }
            var answ = {code:0, response: clone_obj(rows[0])};
            answ.response.followers = [];
            answ.response.following = [];
            answ.response.subscriptions = [];
            var query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + req.body.followee +
                "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + req.body.followee +
                "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + req.body.followee + "');";
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    res.end(error_message(4));
                    return;
                }
                for(var i = 0; i < rows.length; i++) {
                    if(rows[i].ind == 0) answ.response.following.push(rows[i].value);
                    if(rows[i].ind == 1) answ.response.followers.push(rows[i].value);
                    if(rows[i].ind == 2) answ.response.subscriptions.push(+rows[i].value);
                }
                res.end(JSON.stringify(answ));
            });
        });
    });
};

module.exports.unfollow = function(req, res) {
    if(!req.body.follower || !req.body.followee) {
        res.end(error_message(3));
        return;
    }
    var query = "DELETE FROM followers WHERE users_email_following = '" + req.body.followee + "' AND users_email_follower = '" + req.body.follower +"';";
   ;//console.log(query);
    db.query(query, function(err, rows) {
        db.query("SELECT * FROM users WHERE email = ?;", req.body.follower, function(err, rows) {
            if(err) {
               ;//console.log(err);
                res.end(error_message(1));
                return;
            }
            var answ = {code:0, response: clone_obj(rows[0])};
            answ.response.followers = [];
            answ.response.following = [];
            answ.response.subscriptions = [];
            var query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + req.body.followee +
                "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + req.body.followee +
                "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + req.body.followee + "');";
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    res.end(error_message(4));
                    return;
                }
                for(var i = 0; i < rows.length; i++) {
                    if(rows[i].ind == 0) answ.response.following.push(rows[i].value);
                    if(rows[i].ind == 1) answ.response.followers.push(rows[i].value);
                    if(rows[i].ind == 2) answ.response.subscriptions.push(+rows[i].value);
                }
                res.end(JSON.stringify(answ));
            });
        });
    });
};