const db = require('../db');
const Executor = require('../class/executor');

module.exports.details = new Executor((query)=>{
    if (!query.query.forum) {
        return (error_message(3));
    }
    db.query("SELECT * FROM forums WHERE short_name = ?;", query.query.forum, function(err, rows) {
        if (err) {
            return (error_message(5));
        }
        if (!rows[0]) {
            return (error_message(1));
        }
        let response = clone_obj(rows[0]);
        let result = {code: 0};
        result.response = response;
        if (query.query.related == "user") {
            db.query("SELECT * FROM users WHERE email = ?;", rows[0].user, function(err, rows) {
                if (err || !rows[0]) {
                ;//console.log(err);
                return (error_message(4));
                }
                response.user = clone_obj(rows[0]);
                response.user.isAnonymous = !!response.user.isAnonymous;
                response.user.following = [];
                response.user.follower = [];
                response.user.subscriptions = [];
                let query = "SELECT users_email_following FROM followers WHERE users_email_follower = '" + response.user.email +
                    "';SELECT users_email_follower FROM followers WHERE users_email_following = '" + response.user.email +
                    "';SELECT threads_id FROM subscriptions WHERE users_email = '" + response.user.email + "';";
                db.query(query, function(err, rows) {
                    if(err) {
                        ;//console.log(err);
                        return (error_message(4));
                    }
                    for(let i = 0; i < rows.length; i++) {
                        if(rows[i].users_email_following) response.user.following.push(rows[i].users_email_following);
                        if(rows[i].users_email_follower) response.user.following.push(rows[i].users_email_follower);
                        if(rows[i].threads_id) response.user.subscriptions.push(rows[i].threads_id);
                    }
                    return (JSON.stringify(result));
                });
        })} else {
            return (JSON.stringify(result));
        }
    })
};

module.exports.listPosts = new Executor((query)=>{
    let query_s = "SELECT p.*";
    let query_f = "FROM posts p ";
    let query_w = "WHERE p.forum = '" + query.query.forum + "' ";
    if(query.query.since)
        query_w += "AND p.date >= '" + query.query.since + "'";
    query_w += " ORDER BY p.date ";
    if(query.query.order != "asc")
        query_w += "DESC ";
    if(query.query.limit)
        query_w += "LIMIT " + query.query.limit;
    query_w += ";";
    if(query.query.related) {
        if(query.query.related instanceof Array) {
            for(let i = 0; i < query.query.related.length; i++) {
                switch (query.query.related[i]) {
                    case 'forum': query_s += ", f.id AS f_id, f.name as f_name, f.short_name as f_short_name, f.user as f_user";
                        query_f += "JOIN forums f ON p.forum = f.short_name "; break;
                    case 'thread': query_s += ", t.date AS t_date, t.dislikes AS t_dislikes, t.forum AS t_forum, t.id AS t_id, " +
                        "t.isClosed AS t_isClosed, t.isDeleted AS t_isDeleted, t.likes AS t_likes, t.message AS t_message, " +
                        "t.points AS t_points, t.posts AS t_posts, t.slug AS t_slug, t.title AS t_title, t.user AS t_user ";
                        query_f += "JOIN threads t ON p.thread = t.id "; break;
                    case 'user': query_s += ", u.id AS u_id, u.username AS u_username, u.about AS u_about, u.name AS u_name, " +
                        "u.email AS u_email, u.isAnonymous AS u_isAnonymous "; query_f += "JOIN users u ON u.email = p.user "; break;
                }
            }
        } else {
            switch (query.query.related) {
                case 'forum': query_s += ", f.id AS f_id, f.name as f_name, f.short_name as f_short_name, f.user as f_user";
                    query_f += "JOIN forums f ON p.forum = f.short_name "; break;
                case 'thread': query_s += ", t.date AS t_date, t.dislikes AS t_dislikes, t.forum AS t_forum, t.id AS t_id, " +
                    "t.isClosed AS t_isClosed, t.isDeleted AS t_isDeleted, t.likes AS t_likes, t.message AS t_message, " +
                    "t.points AS t_points, t.posts AS t_posts, t.slug AS t_slug, t.title AS t_title, t.user AS t_user ";
                    query_f += "JOIN threads t ON p.thread = t.id "; break;
                case 'user': query_s += ", u.id AS u_id, u.username AS u_username, u.about AS u_about, u.name AS u_name, " +
                    "u.email AS u_email, u.isAnonymous AS u_isAnonymous "; query_f += "JOIN users u ON u.email = p.user "; break;
            }
            query.query.related = [query.query.related];
        }
    }
    query_s += " ";
    db.query(query_s + query_f + query_w, function(err, rows) {
        if(err) ;//console.log(err);
        if(query.query.related) {
            for (let i = 0; i < query.query.related.length; i++) {
                let substr = "";
                let field = "";
                switch (query.query.related[i]) {
                    case 'forum':
                        substr = "f_";
                        field = "forum";
                        break;
                    case 'thread':
                        substr = "t_";
                        field = "thread";
                        break;
                    case 'user':
                        substr = "u_";
                        field = "user";
                        break;
                }
                for (let j = 0; j < rows.length; j++) {
                    rows[j][field] = {};
                    for (let key in rows[j]) {
                        if (key.substr(0, 2) == substr) {
                            rows[j][field][key.substring(2)] = rows[j][key];
                            delete rows[j][key];
                        }
                    }
                }
            }
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listThreads = new Executor((query)=>{
    let query_s = "SELECT t.*";
    let query_f = "FROM threads t ";
    let query_w = "WHERE t.forum = '" + query.query.forum + "' ";
    if(query.query.since)
        query_w += "AND t.date >= '" + query.query.since + "'";
    query_w += " GROUP BY t.id ORDER BY t.date ";
    if(query.query.order != "asc")
        query_w += "DESC ";
    if(query.query.limit)
        query_w += "LIMIT " + query.query.limit;
    query_w += ";";
    let userfix = 0;
    if(query.query.related) {
        if(query.query.related instanceof Array) {
            for(let i = 0; i < query.query.related.length; i++) {
                switch (query.query.related[i]) {
                    case 'forum': query_s += ", f.id AS f_id, f.name as f_name, f.short_name as f_short_name, f.user as f_user";
                        query_f += "JOIN forums f ON t.forum = f.short_name "; break;
                    case 'user': query_s += ", u.id AS u_id, u.username AS u_username, u.about AS u_about, u.name AS u_name, " +
                        "u.email AS u_email, u.isAnonymous AS u_isAnonymous, GROUP_CONCAT(DISTINCT f2.users_email_follower) " +
                        "AS u_followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS u_following, " +
                        "GROUP_CONCAT(DISTINCT s.threads_id) AS u_subscriptions ";
                        query_f += "JOIN users u ON u.email = t.user " +
                            "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
                            "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
                            "LEFT JOIN subscriptions s ON u.email = s.users_email "; userfix = 1; break;
                }
            }
        } else {
            switch (query.query.related) {
                case 'forum': query_s += ", f.id AS f_id, f.name as f_name, f.short_name as f_short_name, f.user as f_user";
                    query_f += "JOIN forums f ON t.forum = f.short_name "; break;
                case 'user': query_s += ", u.id AS u_id, u.username AS u_username, u.about AS u_about, u.name AS u_name, " +
                    "u.email AS u_email, u.isAnonymous AS u_isAnonymous, GROUP_CONCAT(DISTINCT f2.users_email_follower) " +
                    "AS u_followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS u_following, " +
                    "GROUP_CONCAT(DISTINCT s.threads_id) AS u_subscriptions ";
                    query_f += "JOIN users u ON u.email = t.user " +
                    "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
                    "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
                    "LEFT JOIN subscriptions s ON u.email = s.users_email "; userfix = 1; break;
            }
            query.query.related = [query.query.related];
        }
    }
    query_s += " ";
    db.query(query_s + query_f + query_w, function(err, rows) {
        if(err) ;//console.log(err);
        if(query.query.related) {
            for (let i = 0; i < query.query.related.length; i++) {
                let substr = "";
                let field = "";
                switch (query.query.related[i]) {
                    case 'forum':
                        substr = "f_";
                        field = "forum";
                        break;
                    case 'user':
                        substr = "u_";
                        field = "user";
                        break;
                }
                for (let j = 0; j < rows.length; j++) {
                    rows[j][field] = {};
                    for (let key in rows[j]) {
                        if (key.substr(0, 2) == substr) {
                            rows[j][field][key.substring(2)] = rows[j][key];
                            delete rows[j][key];
                        }
                    }
                }
            }
            if(userfix) {
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i].user.followers) rows[i].user.followers = rows[i].user.followers.split(',');
                    else rows[i].user.followers = [];
                    if (rows[i].user.following) rows[i].user.following = rows[i].user.following.split(',');
                    else rows[i].user.following = [];
                    if (rows[i].user.subscriptions) rows[i].user.subscriptions = rows[i].user.subscriptions.split(',');
                    else rows[i].user.subscriptions = [];
                    for (let j = 0; j < rows[i].user.subscriptions.length; j++)
                        rows[i].user.subscriptions[j] = +rows[i].user.subscriptions[j];
                }
            }
        }
        return (JSON.stringify({code:0, response: rows}));
    });
};

module.exports.listUsers = new Executor((query)=>{
    /*let query = "SELECT about, email, GROUP_CONCAT(DISTINCT f2.users_email_follower) AS followers, GROUP_CONCAT(DISTINCT f3.users_email_following) AS following, " +
        "u.id, isAnonymous, name, GROUP_CONCAT(DISTINCT s.threads_id) AS subscriptions, username " +
        "FROM posts p JOIN users u ON u.email = p.user " +
        "LEFT JOIN followers f2 ON u.email = f2.users_email_following " +
        "LEFT JOIN followers f3 ON u.email = f3.users_email_follower " +
        "LEFT JOIN subscriptions s ON u.email = s.users_email " +
        "WHERE p.forum = '" + query.query.forum + "' ";*/

    let query = "SELECT about, email, u.id, isAnonymous, name, u.username " +
        "FROM posts p JOIN users u ON u.email = p.user " +
        "WHERE p.forum = '" + query.query.forum + "' ";
    query += "GROUP BY p.userName ORDER BY p.userName ";
    if(query.query.order != "asc")
        query += "DESC ";
    if(query.query.limit)
        query += "LIMIT " + query.query.limit;
    query += ";";
    //console.log(query);
    db.query(query, function(err, rows) {
        if(err) ;//console.log(err);
        if(rows.length == 0) {
            return (JSON.stringify({code:0, response: {}}));
        }
        let userEmail = "'a'";
        let prevRows = {};
        for(let i = 0; i < rows.length; i++) {
            //console.log(JSON.stringify(rows[i]));
            prevRows[rows[i].email] = rows[i];
            prevRows[rows[i].email].followers = [];
            prevRows[rows[i].email].following = [];
            prevRows[rows[i].email].subscriptions = [];
            userEmail += ", '" + rows[i].email + "'";
        }
        let query = "(SELECT 0+0 AS ind, GROUP_CONCAT(users_email_following) AS value, users_email_follower AS user FROM followers WHERE users_email_follower IN (" + userEmail + ") GROUP BY user) " +
            "UNION (SELECT 0+1 AS ind, GROUP_CONCAT(users_email_follower) AS value, users_email_following AS user FROM followers WHERE users_email_following IN (" + userEmail + ") GROUP BY user) " +
            "UNION (SELECT 0+2 AS ind, GROUP_CONCAT(DISTINCT s.threads_id) AS value, users_email AS user FROM subscriptions s WHERE users_email IN (" + userEmail + ") GROUP BY user);";
        //console.log(userEmail);
        db.query(query, function(err, rows) {
            if(err) ;//console.log(err);
            for(let i = 0; i < rows.length; i++) {
                switch (rows[i].ind) {
                    case 0: prevRows[rows[i].user].following = rows[i].value.split(','); break;
                    case 1: prevRows[rows[i].user].followers = rows[i].value.split(','); break;
                    case 2: prevRows[rows[i].user].subscriptions = rows[i].value.split(','); for (let j = 0; j < prevRows[rows[i].user].subscriptions.length; j++)
                        prevRows[rows[i].user].subscriptions[j] = +prevRows[rows[i].user].subscriptions[j]; break;
                }
            }
            let result = [];
            //console.log(JSON.stringify(prevRows));
            for(i in prevRows) {
                result.push(prevRows[i]);
            }
            return (JSON.stringify({code:0, response: result}));
        });
    });
};


module.exports.create = new Executor(null, (query, body)=>{
    let instead = [query.body.name, query.body.short_name, query.body.user];
    db.query("INSERT INTO forums VALUES(NULL, ?, ?, ?);", instead,
        function(err, rows) {
            if (err) {
                return (error_message(5));
                return;
            }
            query.body.id = rows.insertId;
            return (JSON.stringify({code: 0, response: query.body}));
        })
};
