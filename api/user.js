const db = require('../db');
const Executor = require('../class/executor');

module.exports.details = new Executor((query)=>{
    if(!query.query.user) {
        return (error_message(2));
    }
    db.query("SELECT * FROM users WHERE email = ?;", query.query.user, function(err, rows) {
        if(err) {
           //console.log(err);
            return (error_message(1));
        }
        let result = {code:0, response: clone_obj(rows[0])};
        result.response.followers = [];
        result.response.following = [];
        result.response.subscriptions = [];
        let query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + query.query.user +
        "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + query.query.user +
        "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + query.query.user + "');";
        db.query(query, function(err, rows) {
            if(err) {
               //console.log(err);
                return (error_message(4));
            }
            for(let i = 0; i < rows.length; i++) {
                if(rows[i].ind == 0) result.response.following.push(rows[i].value);
                if(rows[i].ind == 1) result.response.followers.push(rows[i].value);
                if(rows[i].ind == 2) result.response.subscriptions.push(+rows[i].value);
            }
            return (JSON.stringify(result));
        });
    });
};

module.exports.listPosts = new Executor((query)=>{
    let query = "SELECT * FROM posts WHERE user = '" + query.query.user + "' ";
    if(query.query.since)
        query += "AND date > '" + query.query.since + "' ";
    query += "ORDER BY date ";
    if(!query.query.order || query.query.order != "asc")
        query += "DESC ";
    if(query.query.limit)
        query += "LIMIT " + query.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        if(err) {
            return (error_message(3));
        }
        if(!rows.length) {
            return (error_message(1));
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listFollowers = new Executor((query)=>{
    let query = "SELECT about, email, GROUP_CONCAT(DISTINCT f2.users_email_follower) AS followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS following, " +
        "id, isAnonymous, name, GROUP_CONCAT(DISTINCT s.threads_id) AS subscriptions, username " +
        "FROM followers f1 JOIN users u ON u.email = f1.users_email_follower " +
        "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
        "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
        "LEFT JOIN subscriptions s ON u.email = s.users_email " +
        "WHERE f1.users_email_following = '" + query.query.user + "' ";
    if(query.query.since_id)
        query += "AND id >= " + query.query.since_id;
    query += " GROUP BY email ORDER BY name ";
    if(query.query.order != "asc")
        query += "DESC ";
    if(query.query.limit)
        query += "LIMIT " + query.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        for(let i = 0; i < rows.length; i++) {
            if(rows[i].followers) rows[i].followers = rows[i].followers.split(',');
            else rows[i].followers = [];
            if(rows[i].following) rows[i].following = rows[i].following.split(',');
            else rows[i].following = [];
            if(rows[i].subscriptions) rows[i].subscriptions = rows[i].subscriptions.split(',');
            else rows[i].subscriptions = [];
            for(let j = 0; j < rows[i].subscriptions.length; j++)
                rows[i].subscriptions[j] = +rows[i].subscriptions[j];
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listFollowing = new Executor((query)=>{
    let query = "SELECT about, email, GROUP_CONCAT(DISTINCT f2.users_email_follower) AS followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS following, " +
        "id, isAnonymous, name, GROUP_CONCAT(DISTINCT s.threads_id) AS subscriptions, username " +
        "FROM followers f1 JOIN users u ON u.email = f1.users_email_following " +
        "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
        "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
        "LEFT JOIN subscriptions s ON u.email = s.users_email " +
        "WHERE f1.users_email_follower = '" + query.query.user + "' ";
    if(query.query.since_id)
        query += "AND id >= " + query.query.since_id;
    query += " GROUP BY email ORDER BY name ";
    if(query.query.order != "asc")
        query += "DESC ";
    if(query.query.limit)
        query += "LIMIT " + query.query.limit;
    query += ";";
    db.query(query, function(err, rows) {
        for(let i = 0; i < rows.length; i++) {
            if(rows[i].followers) rows[i].followers = rows[i].followers.split(',');
            else rows[i].followers = [];
            if(rows[i].following) rows[i].following = rows[i].following.split(',');
            else rows[i].following = [];
            if(rows[i].subscriptions) rows[i].subscriptions = rows[i].subscriptions.split(',');
            else rows[i].subscriptions = [];
            for(let j = 0; j < rows[i].subscriptions.length; j++)
                rows[i].subscriptions[j] = +rows[i].subscriptions[j];
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.create = new Executor(null, (query, body)=>{
    db.query("INSERT INTO users SET ?;", query.body, function(err, rows) {
        if(err) {
            return (error_message(5));
        }
        if(query.body.isAnonymous) {} else query.body.isAnonymous = false;
        query.body.id = rows.insertId;
        let result = {code: 0, response: query.body};
        return (JSON.stringify(result));
    });
};

module.exports.update = new Executor(null, (query, body)=>{
    if(!query.body.about || !query.body.user || !query.body.name) {
        return (error_message(3));
    }
    let query = "UPDATE users SET about = '" + query.body.about + "', name = '" + query.body.name + "' WHERE email = '" + query.body.user + "';";
    db.query(query, function(err, rows) {
        if(err || !rows.affectedRows) {
            return (error_message(1));
        }
        db.query("SELECT * FROM users WHERE email = ?;", query.body.user, function(err, rows) {
            if(err) {
                return (error_message(4));
            }
            let result = {code: 0, response: rows[0]};
            return (JSON.stringify(result));
        });
    });
};

module.exports.follow = new Executor(null, (query, body)=>{
    if(!query.body.follower || !query.body.followee) {
        return (error_message(3));
    }
    let query = "INSERT INTO followers VALUES('" + query.body.followee + "','" + query.body.follower +"');";
    db.query(query, function(err, rows) {
        db.query("SELECT * FROM users WHERE email = ?;", query.body.followee, function(err, rows) {
            if(err) {
               ;//console.log(err);
                return (error_message(1));
            }
            let result = {code:0, response: clone_obj(rows[0])};
            result.response.followers = [];
            result.response.following = [];
            result.response.subscriptions = [];
            let query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + query.body.followee +
                "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + query.body.followee +
                "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + query.body.followee + "');";
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    return (error_message(4));
                }
                for(let i = 0; i < rows.length; i++) {
                    if(rows[i].ind == 0) result.response.following.push(rows[i].value);
                    if(rows[i].ind == 1) result.response.followers.push(rows[i].value);
                    if(rows[i].ind == 2) result.response.subscriptions.push(+rows[i].value);
                }
                return (JSON.stringify(result));
            });
        });
    });
};

module.exports.unfollow = new Executor(null, (query, body)=>{
    if(!query.body.follower || !query.body.followee) {
        return (error_message(3));
    }
    let query = "DELETE FROM followers WHERE users_email_following = '" + query.body.followee + "' AND users_email_follower = '" + query.body.follower +"';";
   ;//console.log(query);
    db.query(query, function(err, rows) {
        db.query("SELECT * FROM users WHERE email = ?;", query.body.follower, function(err, rows) {
            if(err) {
               ;//console.log(err);
                return (error_message(1));
            }
            let result = {code:0, response: clone_obj(rows[0])};
            result.response.followers = [];
            result.response.following = [];
            result.response.subscriptions = [];
            let query = "(SELECT 0+0 AS ind, users_email_following AS value FROM followers WHERE users_email_follower = '" + query.body.followee +
                "') UNION (SELECT 0+1 AS ind, users_email_follower AS value FROM followers WHERE users_email_following = '" + query.body.followee +
                "') UNION (SELECT 0+2 AS ind, threads_id AS value FROM subscriptions WHERE users_email = '" + query.body.followee + "');";
            db.query(query, function(err, rows) {
                if(err) {
                   ;//console.log(err);
                    return (error_message(4));
                }
                for(let i = 0; i < rows.length; i++) {
                    if(rows[i].ind == 0) result.response.following.push(rows[i].value);
                    if(rows[i].ind == 1) result.response.followers.push(rows[i].value);
                    if(rows[i].ind == 2) result.response.subscriptions.push(+rows[i].value);
                }
                return (JSON.stringify(result));
            });
        });
    });
};