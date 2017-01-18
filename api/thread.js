const db = require('../db');
const Executor = require('../class/executor');

const close = function *() {
  let closeThread = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Threads set isClosed = true where id = ?;', [closeThread.thread]);
  let fromThread = yield connection.query('select id from Threads where id = ?', [closeThread.thread]);
  let information = {
    code: 0,
    response: fromThread[0].id
  };
  this.body = information;
};


const create = function *() {
  let newThread = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('insert into Threads (forum, title, isClosed, user, date, message, slug, isDeleted) values (?,?,?,?,?,?,?,?);',
    [newThread.forum, newThread.title, newThread.isClosed, newThread.user, newThread.date,
      newThread.message, newThread.slug, newThread.isDeleted]);
  let fromThread = yield connection.query('select  date, forum, id, isClosed, isDeleted, message, slug,' +
    'title,user from Threads where title = ? and date = ? and message = ?',
    [newThread.title, newThread.date, newThread.message]);
  let information = {
    code: 0,
    response: fromThread[0]
  };
  this.body = information;
};

const details = function *() {
  let threadId = this.query.thread;
  let moreInfo = this.query.related || [];
  if (typeof moreInfo === 'string') {
    moreInfo = moreInfo.split(' ');
  }
  let connection = yield mysql.getConnection();
  let threadInfo = yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes,' +
    'message, likes - dislikes as points, posts, slug ,title,user from Threads where id = ?;', [threadId]);
  let thread = false;
  for (let i = 0; i < moreInfo.length; ++i) {
    if (moreInfo[i] === 'thread') {
      thread = true;
    }
  }
  if (threadInfo.length === 0 || thread) {
    let information = {
      code: 3,
      response: {}
    };
    this.body = information;
  } else {
    threadInfo[0].date = moment(threadInfo[0].date).format('YYYY-MM-DD HH:mm:ss').toString();
    for (let i = 0; i < moreInfo.length; ++i) {
      switch (moreInfo[i]) {
        case 'user':
          for (let j = 0; j < threadInfo.length; ++j) {
            userInfo = yield connection.query('select * from Users where email = ?;', [threadInfo[j].user]);
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
      response: threadInfo[0]
    };
    this.body = information;
  }
};

const list = function *() {
  let threadData = this.query.since || '0000-00-00 00:00:00';
  let order = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let threadUser = this.query.user || false;
  let threadForum = this.query.forum || false;
  let threadInfo = {};
  let connection = yield mysql.getConnection();
  if (!threadUser) {
    if (limit === -1) {
      threadInfo = yield connection.query('select date, dislikes, forum, id, ' +
        'isClosed, isDeleted, likes, message, likes - dislikes as ' +
        'points, posts, slug, title, user from Threads where forum = ? and date >= ? ' +
        'order by date ' + order + ' ;', [threadForum, threadData]);
    } else {
      threadInfo = yield connection.query('select date, dislikes, forum, id, ' +
        'isClosed, isDeleted, likes, message, likes - dislikes as ' +
        'points, posts, slug , title, user from Threads where forum = ? and date >= ? ' +
        'order by date ' + order + ' limit ?;', [threadForum, threadData, +limit]);
    }
  } else {
    if (limit === -1) {
      threadInfo = yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes,' +
        'message,likes - dislikes as points, posts, slug ,title,user from Threads where user = ? and date >= ? ' +
        'order by date ' + order + ';', [threadUser, threadData]);
    } else {
      threadInfo = yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes,' +
        'message,likes - dislikes as points, posts, slug ,title,user from Threads where user = ? and date >= ? ' +
        'order by date ' + order + ' limit ?;', [threadUser, threadData, +limit]);
    }
  }
  for (let i = 0; i < threadInfo.length; ++i) {
    threadInfo[i].date = moment(threadInfo[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
  }
  let information = {
    code: 0,
    response: threadInfo
  };
  this.body = information;
};

const listPosts = function *() {
  let threadData = this.query.since || '0000-00-00 00:00:00';
  let dateTrue = new Date();
  dateTrue.setFullYear(+threadData.substring(0, 4), +threadData.substring(5, 7), +threadData.substring(8, 10));
  dateTrue.setHours(+threadData.substring(11, 13), +threadData.substring(14, 16), +threadData.substring(17, 19));
  let bufdate = Date.parse(threadData);
  let date = new Date();
  date.setTime(bufdate);
  let order = this.query.order || 'desc';
  let sort = this.query.sort || 'flat';
  let threadId = this.query.thread;
  let limit = this.query.limit || -1;
  let threadInfo;
  let connection = yield mysql.getConnection();
  let information;
  switch (sort) {
    case 'flat' :
      if (limit === -1) {
        threadInfo = yield connection.query('select Posts.date, Posts.dislikes, Posts.forum, Posts.id, Posts.isApproved,' +
          ' Posts.isDeleted, Posts.isEdited, Posts.isHighlighted, Posts.isSpam, Posts.likes, Posts.message, ' +
          'Posts.parent, Posts.likes - Posts.dislikes as points, Posts.thread, Posts.user from Posts ' +
          'where thread = ? and date >= ? order by date ' +
          order + ';', [threadId, threadData]);

      } else {
        threadInfo = yield connection.query('select Posts.date, Posts.dislikes, Posts.forum, Posts.id, Posts.isApproved,' +
          ' Posts.isDeleted, Posts.isEdited, Posts.isHighlighted, Posts.isSpam, Posts.likes, Posts.message, ' +
          'Posts.parent, Posts.likes - Posts.dislikes as points, Posts.thread, Posts.user from Posts ' +
          'where thread = ? and date >= ? order by date ' +
          order + ' limit ?;', [threadId, threadData, +limit]);
      }
      for (let i = 0; i < threadInfo.length; ++i) {
        threadInfo[i].date = moment(threadInfo[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
      }
      information = {
        code: 0,
        response: threadInfo
      };
      this.body = information;
      break;
    case 'tree' :
      if (limit === -1) {
        threadInfo = yield connection.query('select date, dislikes, forum, id, isApproved,' +
          ' isDeleted, isEdited, isHighlighted, isSpam, likes, message, ' +
          'parent, likes - dislikes as points, thread, user from Posts where thread = ? and ' +
          'date >= ? order by sorter_date' + order + ', sorter asc;',
          [threadId, threadData]);
      } else {
        threadInfo = yield connection.query('select date, dislikes, forum, id, isApproved,' +
          ' isDeleted, isEdited, isHighlighted, isSpam, likes, message, ' +
          'parent, likes - dislikes as points, thread, user from Posts where ' +
          'thread = ? and date >= ? order by sorter_date ' + order + ', sorter asc limit ?;',
          [threadId, threadData, +limit]);
      }
      for (let i = 0; i < threadInfo.length; ++i) {
        threadInfo[i].date = moment(threadInfo[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
      }
      information = {
        code: 0,
        response: threadInfo
      };
      this.body = information;
      break;
    case 'parent_tree' :
      if (limit === -1) {
        threadInfo = yield connection.query('select P.id, P.message, P.date, P.likes, P.dislikes, (P.likes-P.dislikes) as points, ' +
          'P.isApproved, P.isHighlighted, P.isEdited, P.isSpam, P.isDeleted, P.parent, P.thread, P.user, P.forum from' +
          ' Posts P inner join (select distinct sorter_date from Posts where thread = ? order by sorter_date ' + order +
          ', sorter asc) A on P.sorter_date = A.sorter_date where P.date >= ? order by P.sorter_date ' + order +
          ', P.sorter asc;', [threadId, date]);
      } else {
        threadInfo = yield connection.query('select P.id, P.message, P.date, P.likes, P.dislikes, (P.likes-P.dislikes) as points, ' +
          'P.isApproved, P.isHighlighted, P.isEdited, P.isSpam, P.isDeleted, P.parent, P.thread, P.user, P.forum from' +
          ' Posts P inner join (select distinct sorter_date from Posts where thread = ? order by sorter_date ' + order +
          ', sorter asc limit ? ) A on P.sorter_date = A.sorter_date where P.date >= ? order by P.sorter_date ' + order +
          ', P.sorter asc;', [threadId, +limit, date]);
      }
      for (let i = 0; i < threadInfo.length; ++i) {
        threadInfo[i].date = moment(threadInfo[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
      }
      information = {
        code: 0,
        response: threadInfo
      };
      this.body = information;
      break;
  }
};

const open = function *() {
  let idThread = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Threads set isClosed = ? where id = ?;', [false, idThread.thread]);
  let information = {
    code: 0,
    response: idThread
  };
  this.body = information;
};

const remove = function *() {
  let idThread = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Threads set isDeleted = ? where id = ?;', [true, idThread.thread]);
  yield connection.query('update Threads set posts = 0 where id = ?;', [idThread.thread]);
  yield connection.query('update Posts set isDeleted = ? where thread = ?;', [true, idThread.thread]);
  let information = {
    code: 0,
    response: idThread
  };
  this.body = information;
};

const restore = function *() {
  let idThread = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Threads set isDeleted = ? where id = ?;', [false, idThread.thread]);
  let count = yield connection.query('select count(id) from Posts where thread = ?', [idThread.thread]);
  yield connection.query('update Threads set posts = ? where id = ?', [count[0]['count(id)'], idThread.thread])
  yield connection.query('update Posts set isDeleted = ? where thread = ?;', [false, idThread.thread]);
  let information = {
    code: 0,
    response: idThread
  };
  this.body = information;
};

const subscribe = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  let check = yield connection.query('select * from Subscriptions where thread = ? and user = ?', [info.thread, info.user]);
  if (check.length === 0) {
    yield connection.query('insert into Subscriptions (thread,user) values (?,?);', [info.thread, info.user]);
    let information = {
      code: 0,
      response: info
    };
    this.body = information;
  } else {
    let information = {
      code: 5,
      response: {}
    };
    this.body = information;
  }

};

const unsubscribe = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('delete from Subscriptions where thread = ? and user = ?;', [info.thread, info.user]);
  let information = {
    code: 0,
    response: info
  };
  this.body = information;
};

const update = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Threads set message = ? where id = ?;', [info.message, info.thread]);
  yield connection.query('update Threads set slug = ? where id = ?;', [info.slug, info.thread]);
  let information = {
    code: 0,
    response: yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes,' +
      'message,likes - dislikes as points, posts, slug ,title,user from Threads ' +
      'where id = ?;',
      [info.thread])
  };
  this.body = information;
};

const vote = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  if (info.vote === 1) {
    let likes = yield connection.query('select likes from Threads where id = ?;', [info.thread]);
    ++likes[0].likes;
    yield connection.query('update Threads set likes = ? where id = ?;', [likes[0].likes, info.thread]);
  } else {
    let dislikes = yield connection.query('select dislikes from Threads where id = ?;', [info.thread]);
    ++dislikes[0].dislikes;
    yield connection.query('update Threads set dislikes = ? where id = ?;', [dislikes[0].dislikes, info.thread]);
  }
  let information = {
    code: 0,
    response: yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes,' +
      'message,likes - dislikes as points, posts, slug ,title,user from Threads ' +
      'where id = ?;', [info.thread])
  };
  this.body = information;
};

module.exports.create = create;
module.exports.details = details;
module.exports.list = list;
module.exports.close = close;
module.exports.vote = vote;
module.exports.unsubscribe = unsubscribe;
module.exports.listPosts = listPosts;
module.exports.restore = restore;
module.exports.subscribe = subscribe;
module.exports.open = open;
module.exports.remove = remove;
module.exports.update = update;
