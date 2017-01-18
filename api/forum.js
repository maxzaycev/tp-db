const db = require('../db');
//const Executor = require('../class/executor');

const create = function *() {
  let newForum = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('insert into Forums (name, short_name, user) values (?,?,?);', [newForum.name, newForum.short_name, newForum.user]);
  let fromForum = yield connection.query('select * from Forums where short_name = ?;', [newForum.short_name]);
  let information = {
    code: 0,
    response: fromForum[0]
  };
  this.body = information;
};

const details = function *() {
  let forum = this.query.forum;
  let moreInfo = this.query.related || '';
  let connection = yield mysql.getConnection();
  let forumId = yield connection.query('select * from Forums where short_name = ?;', [forum]);
  if (moreInfo === 'user') {
    let user = yield connection.query('select * from Users where email = ?;', [forumId[0].user]);
    let follower = yield connection.query('select follower from Followers where followee = ?;', [forumId[0].user]);
    let followee = yield  connection.query('select followee from Followers where follower = ?;', [forumId[0].user]);
    let subcriptions = yield connection.query('select * from Subscriptions where user = ?;', [forumId[0].user]);
    follower.forEach(function (item, i) {
      user[0].followers[i] = item.follower;
    });

    followee.forEach(function (item, i) {
      user[0].following[i] = item.followee;
    });
    subcriptions.forEach(function (item, i) {
      user[0].subscriptions[i] = item.thread;
    });
    forumId[0].user = user[0];
  }
  let information = {
    code: 0,
    response: forumId[0]
  };
  this.body = information;
};

const listPosts = function *() {
  let forum = this.query.forum;
  let forumData = this.query.since || '0000-00-00 00:00:00';
  let forumSort = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let moreInfo = this.query.related || [];
  if (typeof moreInfo === 'string') {
    moreInfo = moreInfo.split();
  }
  let connection = yield mysql.getConnection();
  let threadInfo = {};
  let userInfo = {};
  let forumInfo = {};
  let PostInfo;
  if (limit === -1) {
    if (forumSort === 'desc') {
      PostInfo = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted,isEdited, isHighlighted, ' +
        'isSpam, likes , message, parent, likes - dislikes as points, thread, user from Posts where forum = ?' +
        'and date >= ? order by date desc ;', [forum, forumData]);
    } else {
      PostInfo = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted,isEdited, isHighlighted, ' +
        'isSpam, likes , message, parent, likes - dislikes as points, thread, user from Posts where forum = ?' +
        'and date >= ? order by date asc ;', [forum, forumData]);
    }
  } else {
    if (forumSort === 'desc') {
      PostInfo = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted,isEdited, isHighlighted, ' +
        'isSpam, likes , message, parent, likes - dislikes as points, thread, user from Posts where forum = ?' +
        'and date >= ? order by date desc limit ?;', [forum, forumData, +limit]);
    } else {
      PostInfo = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted,isEdited, isHighlighted, ' +
        'isSpam, likes , message, parent, likes - dislikes as points, thread, user from Posts where forum = ?' +
        'and date >= ? order by date asc limit ?;', [forum, forumData, +limit]);
    }
  }
  for (let j = 0; j < PostInfo.length; ++j) {
    PostInfo[j].date = moment(PostInfo[j].date).format('YYYY-MM-DD HH:mm:ss').toString();
  }
  for (let i = 0; i < moreInfo.length; ++i) {
    switch (moreInfo[i]) {
      case 'thread':
        for (let j = 0; j < PostInfo.length; ++j) {
          threadInfo = yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes, ' +
            'message, likes - dislikes as points, posts, slug, title, user from Threads where id = ?;',
            [PostInfo[j].thread]);
          threadInfo[0].date = moment(threadInfo[0].date).format('YYYY-MM-DD HH:mm:ss').toString();
          PostInfo[j].thread = threadInfo[0];
        }
        break;
      case 'user':
        for (let j = 0; j < PostInfo.length; ++j) {
          userInfo = yield connection.query('select * from Users where email = ?;', [PostInfo[j].user]);
          PostInfo[j].user = userInfo[0];
        }
        break;
      case 'forum':
        for (let j = 0; j < PostInfo.length; ++j) {
          forumInfo = yield connection.query('select * from Forums where short_name = ?;', [PostInfo[j].forum]);
          PostInfo[j].forum = forumInfo[0];
        }
        break;
    }
  }
  let information = {
    code: 0,
    response: PostInfo
  };
  this.body = information;
};

const listThreads = function *() {
  let forum = this.query.forum;
  let forumData = this.query.since || '0000-00-00 00:00:00';
  let forumSort = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let moreInfo = this.query.related || [];
  if (typeof moreInfo === 'string') {
    moreInfo = [moreInfo];
  }
  let connection = yield mysql.getConnection();
  let forumInfo;
  let threadInfo;
  if (limit === -1) {
    threadInfo = yield connection.query('select date, dislikes, id, isClosed, isDeleted, likes, message, likes - dislikes as points, ' +
      'posts, slug, title, forum, user from Threads where forum = ?' +
      'and date >= ? order by date ' + forumSort + ';', [forum, forumData]);
  } else {
    threadInfo = yield connection.query('select date, dislikes, id, isClosed, isDeleted, likes, message, likes - dislikes as points, ' +
      'posts, slug, title, forum, user from Threads where forum = ?' +
      'and date >= ? order by date ' + forumSort + '  limit ?;', [forum, forumData, +limit]);

  }
  for (let k = 0; k < threadInfo.length; ++k) {
    threadInfo[k].date = moment(threadInfo[k].date).format('YYYY-MM-DD HH:mm:ss').toString();
  }
  let userInfo;
  for (let i = 0; i < moreInfo.length; ++i) {
    switch (moreInfo[i]) {
      case 'user':
        for (let j = 0; j < threadInfo.length; ++j) {
          userInfo = yield connection.query('select * from Users where email = ?;', [threadInfo[j].user]);
          let follower = yield connection.query('select follower from Followers where followee = ?;', [userInfo[0].email]);
          let followee = yield  connection.query('select followee from Followers where follower = ?;', [userInfo[0].email]);
          let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [userInfo[0].email]);
          if (follower.length !== 0) {
            follower.forEach(function (item, j) {
              userInfo[0].followers[j] = item.follower;
            });
          } else {
            userInfo[0].followers = [];
          }
          if (followee.length !== 0) {
            followee.forEach(function (item, j) {
              userInfo[0].following[j] = item.followee;
            });
          } else {
            userInfo[0].following = [];
          }
          userInfo[0].subscriptions = [];
          if (subcriptions.length !== 0) {
            subcriptions.forEach(function (item, j) {
              userInfo[0].subscriptions[j] = item.thread;
            });
          }

          threadInfo[j].user = userInfo[0];
        }
        break;
      case 'forum':
        for (let j = 0; j < threadInfo.length; ++j) {
          forumInfo = yield connection.query('select * from Forums where short_name = ?;', [threadInfo[j].forum]);
          threadInfo[j].forum = forumInfo[0];
        }
        break;
    }
  }
  let information = {
    code: 0,
    response: threadInfo
  };
  this.body = information;
};

const listUsers = function *() {
  let forum = this.query.forum;
  let forumSort = this.query.order || 'desc';
  let connection = yield mysql.getConnection();
  let limit = this.query.limit || -1;
  let since_id = this.query.since_id || 0;
  let user;
  if (limit === -1) {
    if (forumSort === 'asc') {
      user = yield connection.query('select about, email, Users.id, isAnonymous, Users.name, username from Users inner join ' +
        ' Posts on Users.email = Posts.user where forum = ? and Users.id >= ? group by Posts.user order by Users.name asc;', [forum, since_id]);
    } else {
      user = yield connection.query('select about, email, Users.id, isAnonymous, Users.name, username from Users inner join ' +
        ' Posts on Users.email = Posts.user where forum = ? and Users.id >= ? group by Posts.user order by Users.name desc;', [forum, since_id]);
    }
  } else {
    if (forumSort === 'asc') {
      user = yield connection.query('select about, email, Users.id, isAnonymous, Users.name, username from Users inner join ' +
        ' Posts on Users.email = Posts.user where forum = ? and Users.id >= ? group by Posts.user order by Users.name asc limit ?;',
        [forum, since_id, +limit]);
    } else {
      user = yield connection.query('select about, email, Users.id, isAnonymous, Users.name, username from Users inner join ' +
        ' Posts on Users.email = Posts.user where forum = ? and Users.id >= ? group by Posts.user order by Users.name desc limit ?;',
        [forum, since_id, +limit]);
    }
  }
  for (let i = 0; i < user.length; ++i) {
    let follower = yield connection.query('select follower from Followers where followee = ?;', [user[i].email]);
    let followee = yield  connection.query('select followee from Followers where follower = ?;', [user[i].email]);
    let subcriptions = yield connection.query('select thread from Subscriptions where user = ?;', [user[i].email]);
    if (follower.length !== 0) {
      follower.forEach(function (item, j) {
        user[i].followers[j] = item.follower;
      });
    } else {
      user[i].followers = [];
    }
    if (followee.length !== 0) {
      followee.forEach(function (item, j) {
        user[i].following[j] = item.followee;
      });
    } else {
      user[i].following = [];
    }
    user[i].subscriptions = [];
    if (subcriptions.length !== 0) {
      subcriptions.forEach(function (item, j) {
        user[i].subscriptions[j] = item.thread;
      });
    }

  }
  let information = {
    code: 0,
    response: user
  };
  this.body = information;
};

module.exports.create = create;
module.exports.details = details;
module.exports.listPosts = listPosts;
module.exports.listThreads = listThreads;
module.exports.listUsers = listUsers;
