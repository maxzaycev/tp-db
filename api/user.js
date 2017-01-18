const db = require('../db');
const Executor = require('../class/executor');

const create = function *() {
  let newUser = this.request.body;
  let connection = yield mysql.getConnection();
  let result = yield connection.query('select name from Users where email = ?', [newUser.email]);
  if (result.length !== 0) {
    let information = {
      code: 5,
      response: {}
    };
    this.body = information;
  } else {
    yield connection.query('insert into Users (username, about, isAnonymous, name, email) values (?,?,?,?,?);',
      [newUser.username, newUser.about, newUser.isAnonymous, newUser.name, newUser.email]);
    let fromPost = yield connection.query('select  about, email, id, isAnonymous, name, username from ' +
      'Users where email = ?', [newUser.email]);
    let information = {
      code: 0,
      response: fromPost[0]
    };
    this.body = information;
  }
};

const details = function *() {
  let email = this.query.user;
  let connection = yield mysql.getConnection();
  let user = yield connection.query('select * from Users where email = ?;', [email]);
  let follower = yield connection.query('select follower from Followers where followee = ?;', [email]);
  let followee = yield  connection.query('select followee from Followers where follower = ?;', [email]);
  let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [email]);
  user[0].followers = [];
  user[0].following = [];
  user[0].subscriptions = [];
  if (follower !== []) {
    follower.forEach(function (item, i) {
      user[0].followers[i] = item.follower;
    });
  }
  if (followee !== []) {
    followee.forEach(function (item, i) {
      user[0].following[i] = item.followee;
    });
  }
  if (subcriptions !== []) {
    subcriptions.forEach(function (item, i) {
      user[0].subscriptions[i] = item.thread;
    });
  }
  let information = {
    code: 0,
    response: user[0]
  };
  this.body = information;
};

const follow = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('insert into Followers (followee, follower) values (?,?);', [info.followee, info.follower]);
  let user = yield connection.query('select * from Users where email = ?;', [info.follower]);
  let follower = yield connection.query('select follower from Followers where followee = ?;', [info.follower]);
  let followee = yield  connection.query('select followee from Followers where follower = ?;', [info.follower]);
  let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [info.follower]);
  user[0].followers = [];
  user[0].following = [];
  user[0].subscriptions = [];
  follower.forEach(function (item, i) {
    user[0].followers[i] = item.follower;
  });

  followee.forEach(function (item, i) {
    user[0].following[i] = item.followee;
  });
  subcriptions.forEach(function (item, i) {
    user[0].subscriptions[i] = item.thread;
  });
  let information = {
    code: 0,
    response: user
  };
  this.body = information;
};

const listFollowers = function *() {
  let email = this.query.user;
  let order = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let since = this.query.since_id || 0;
  let connection = yield mysql.getConnection();
  let users;
  if (order === 'desc') {
    if (limit === -1) {
      users = yield connection.query('select follower from Followers join Users on Followers.followee = Users.email' +
        ' where followee = ? and id > ? order by follower desc;', [email, since]);
    } else {
      users = yield connection.query('select follower from Followers join Users on Followers.followee = Users.email' +
        ' where followee = ? and id > ? order by follower desc limit ?;', [email, since, +limit]);
    }
  } else {
    if (limit === -1) {
      users = yield connection.query('select follower from Followers join Users on Followers.followee = Users.email' +
        ' where followee = ? and id > ? order by follower asc;', [email, since]);
    } else {
      users = yield connection.query('select follower from Followers join Users on Followers.followee = Users.email' +
        ' where followee = ? and id > ? order by follower asc limit ?;', [email, since, +limit]);
    }
  }
  for (let i = 0; i < users.length; ++i) {
    let info = yield connection.query('select * from Users where email = ?', [users[i].follower]);
    let follower = yield connection.query('select follower from Followers where followee = ?;', [users[i].follower]);
    let followee = yield connection.query('select followee from Followers where follower = ?;', [users[i].follower]);
    let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [users[i].follower]);
    info[0].followers = [];
    info[0].following = [];
    info[0].subscriptions = [];
    follower.forEach(function (item, i) {
      info[0].followers[i] = item.follower;
    });
    followee.forEach(function (item, i) {
      info[0].following[i] = item.followee;
    });
    subcriptions.forEach(function (item, i) {
      info[0].subscriptions[i] = item.thread;
    });
    users[i] = info[0];
  }
  let information = {
    code: 0,
    response: users
  };
  this.body = information;
};

const listFollowing = function *() {
  let email = this.query.user;
  let order = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let since = this.query.since_id || 0;
  let connection = yield mysql.getConnection();
  let users;
  if (order === 'desc') {
    if (limit === -1) {
      users = yield connection.query('select followee from Followers join Users on Followers.follower = Users.email' +
        ' where follower = ? and id > ? order by followee desc;', [email, since]);
    } else {
      users = yield connection.query('select followee from Followers join Users on Followers.follower = Users.email' +
        ' where follower = ? and id > ? order by followee desc limit ?;', [email, since, +limit]);
    }
  } else {
    if (limit === -1) {
      users = yield connection.query('select followee from Followers join Users on Followers.follower = Users.email' +
        ' where follower = ? and id > ? order by followee asc;', [email, since]);
    } else {
      users = yield connection.query('select followee from Followers join Users on Followers.follower = Users.email' +
        ' where follower = ? and id > ? order by followee asc limit ?;', [email, since, +limit]);
    }
  }
  for (let i = 0; i < users.length; ++i) {
    let info = yield connection.query('select * from Users where email = ?', [users[i].followee]);
    let follower = yield connection.query('select follower from Followers where followee = ?;', [users[i].followee]);
    let followee = yield connection.query('select followee from Followers where follower = ?;', [users[i].followee]);
    let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [users[i].followee]);
    info[0].followers = [];
    info[0].following = [];
    info[0].subscriptions = [];
    follower.forEach(function (item, i) {
      info[0].followers[i] = item.follower;
    });
    followee.forEach(function (item, i) {
      info[0].following[i] = item.followee;
    });
    subcriptions.forEach(function (item, i) {
      info[0].subscriptions[i] = item.thread;
    });
    users[i] = info[0];
  }
  let information = {
    code: 0,
    response: users
  };
  this.body = information;
};

const listPosts = function *() {
  let email = this.query.user;
  let order = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let data = this.query.data || '0000-00-00 00:00:00';
  let connection = yield mysql.getConnection();
  let posts;
  if (limit === -1) {
    posts = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, isHighlighted,' +
      ' isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where user = ? and date >= ?' +
      ' order by date ' + order + ';', [email, data]);
  } else {
    posts = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, isHighlighted,' +
      ' isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where user = ? and date >= ?' +
      ' order by date ' + order + ' limit ?;', [email, data, +limit]);
  }
  for (let i = 0; i < posts.length; ++i) {
    posts[i].date = moment(posts[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
  }
  let information = {
    code: 0,
    response: posts
  };
  this.body = information;
};

const unfollow = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('delete from Followers where followee = ? and follower = ?', [info.followee, info.follower]);
  let user = yield connection.query('select * from Users where email = ?', [info.follower]);
  let follower = yield connection.query('select follower from Followers where followee = ?;', [info.follower]);
  let followee = yield connection.query('select followee from Followers where follower = ?;', [info.follower]);
  let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [info.follower]);
  user[0].followers = [];
  user[0].following = [];
  user[0].subscriptions = [];
  follower.forEach(function (item, i) {
    user[0].followers[i] = item.follower;
  });
  followee.forEach(function (item, i) {
    user[0].following[i] = item.followee;
  });
  subcriptions.forEach(function (item, i) {
    user[0].subscriptions[i] = item.thread;
  });
  let information = {
    code: 0,
    response: user[0]
  };
  this.body = information;
};

const updateProfile = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Users set about = ? where email = ?', [info.about, info.user]);
  yield connection.query('update Users set name = ? where email = ?', [info.name, info.user]);
  let user = yield connection.query('select * from Users where email = ?', [info.user]);
  let follower = yield connection.query('select follower from Followers where followee = ?;', [info.user]);
  let followee = yield connection.query('select followee from Followers where follower = ?;', [info.user]);
  let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [info.user]);
  user[0].followers = [];
  user[0].following = [];
  user[0].subscriptions = [];
  follower.forEach(function (item, i) {
    user[0].followers[i] = item.follower;
  });
  followee.forEach(function (item, i) {
    user[0].following[i] = item.followee;
  });
  subcriptions.forEach(function (item, i) {
    user[0].subscriptions[i] = item.thread;
  });
  let information = {
    code: 0,
    response: user[0]
  };
  this.body = information;
};

module.exports.create = create;
module.exports.details = details;
module.exports.follow = follow;
module.exports.listFollowers = listFollowers;
module.exports.unfollow = unfollow;
module.exports.updateProfile = updateProfile;
module.exports.listPosts = listPosts;
module.exports.listFollowing = listFollowing;
