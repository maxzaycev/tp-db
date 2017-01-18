const db = require('../db');
const Executor = require('../class/executor');

const create = function *() {
  let newPost = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('insert into Posts (isApproved, user, date, message, isSpam, isHighlighted, thread, forum, ' +
    'isDeleted, isEdited, parent) values (?,?,?,?,?,?,?,?,?,?,?);',
    [newPost.isApproved, newPost.user, newPost.date, newPost.message, newPost.isSpam,
      newPost.isHighlighted, newPost.thread, newPost.forum,
      newPost.isDeleted, newPost.isEdited, newPost.parent]);
  let id = yield connection.query('select id from Posts where user = ? and thread = ? and forum = ? and message = ? and date = ?', [newPost.user,
    newPost.thread, newPost.forum, newPost.message, newPost.date]);
  let sorter = '';
  let sorter_date = '';
  let sort;
  if (newPost.parent > 0) {
    sort = yield connection.query('select sorter from Posts where id = ?;', [newPost.parent]);
    sorter = sort[0].sorter + '.';
    let num = sorter.indexOf('.');
    sorter_date = sorter.slice(0, num);
  } else {
    sorter_date = '00' + id[0].id;
  }
  let buffer = '' + id[0].id;
  let nu = '';
  for (let i = 0; i < 6 - buffer.length; ++i) {
    nu = nu + '0';
  }
  yield connection.query('update Posts set sorter = ?, sorter_date = ? where id = ?',
    [sorter + nu + id[0].id, sorter_date, id[0].id]);
  let numOfPost = yield connection.query('select posts from Threads where id = ?', newPost.thread);
  ++numOfPost[0].posts;
  yield connection.query('update Threads set posts = ? where id = ?;', [numOfPost[0].posts, newPost.thread]);
  let fromPost = yield connection.query('select date, forum,	id,	isApproved, isDeleted, isEdited, isHighlighted, ' +
    'isSpam, message, parent, thread, user from Posts where message = ? and date = ?', [newPost.message, newPost.date]);
  let information = {
    code: 0,
    response: fromPost[0]
  };
  this.body = information;
};

const details = function *() {
  let postId = this.query.post;
  let moreInfo = this.query.related || [];
  if (typeof moreInfo === 'string') {
    moreInfo = moreInfo.split();
  }
  if (postId <= 0) {
    let information = {
      code: 1,
      response: {}
    };
    this.body = information;
  } else {
    let connection = yield mysql.getConnection();
    let post = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
      'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where id = ?', [postId]);
    post[0].date = moment(post[0].date).format('YYYY-MM-DD HH:mm:ss').toString();
    for (let i = 0; i < moreInfo.length; ++i) {
      switch (moreInfo[i]) {
        case 'thread':
          threadInfo = yield connection.query('select date, dislikes, forum, id, isClosed, isDeleted, likes, ' +
            'message, likes - dislikes as points, posts, slug, title, user from Threads where id = ?;',
            [post[0].thread]);
          threadInfo[0].date = moment(threadInfo[0].date).format('YYYY-MM-DD HH:mm:ss').toString();
          post[0].thread = threadInfo[0];
          break;
        case 'user':
          userInfo = yield connection.query('select * from Users where email = ?;', [post[0].user]);
          post[0].user = userInfo[0];
          break;
        case 'forum':
          forumInfo = yield connection.query('select * from Forums where short_name = ?;', [post[0].forum]);
          post[0].forum = forumInfo[0];
          break;
      }
    }
    let information = {
      code: 0,
      response: post[0]
    };
    this.body = information;
  }
};

const list = function *() {
  let forum = this.query.forum || '';
  let threadId = this.query.thread || '';
  let sort = this.query.order || 'desc';
  let limit = this.query.limit || -1;
  let data = this.query.since || '0000-00-00 00:00:00';
  let connection = yield mysql.getConnection();
  let postList = {};
  if (threadId === '') {
    if (limit === -1) {
      postList = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
        'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where ' +
        'forum = ? and date >= ? order by date ' + sort + ';', [forum, data]);
    } else {
      postList = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
        'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where ' +
        'forum = ? and date >= ? order by date ' + sort + ' limit ?;', [forum, data, +limit]);
    }
  } else {
    if (limit === -1) {
      postList = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
        'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where ' +
        'thread = ? and date >= ? order by date ' + sort + ';', [threadId, data]);
    } else {
      postList = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
        'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where ' +
        'thread = ? and date >= ? order by date ' + sort + ' limit ?;', [threadId, data, +limit]);
    }
  }
  for (let i = 0; i < postList.length; ++i) {
    postList[i].date = moment(postList[i].date).format('YYYY-MM-DD HH:mm:ss').toString();
  }
  let information = {
    code: 0,
    response: postList
  };
  this.body = information;
};

const remove = function *() {
  let post = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Posts set isDeleted = ? where id = ?;', [true, post.post]);
  let thread = yield connection.query('select thread from Posts where id = ?', [post.post]);
  let numOfPost = yield connection.query('select posts from Threads where id = ?', [thread[0].thread]);
  --numOfPost[0].posts;
  yield connection.query('update Threads set posts = ? where id = ?;', [numOfPost[0].posts, thread[0].thread]);
  let information = {
    code: 0,
    response: post
  };
  this.body = information;
};

const restore = function *() {
  let post = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Posts set isDeleted = ? where id = ?;', [false, post.post]);
  let thread = yield connection.query('select thread from Posts where id = ?', [post.post]);
  let numOfPost = yield connection.query('select posts from Threads where id = ?', [thread[0].thread]);
  ++numOfPost[0].posts;
  yield connection.query('update Threads set posts = ? where id = ?;', [numOfPost[0].posts, thread[0].thread]);
  let information = {
    code: 0,
    response: post
  };
  this.body = information;
};

const update = function *() {
  let post = this.request.body;
  let connection = yield mysql.getConnection();
  yield connection.query('update Posts set message = ? where id = ?', [post.message, post.post]);
  let postInfo = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, ' +
    'isHighlighted, isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where id = ?',
    [post.post]);
  let information = {
    code: 0,
    response: postInfo
  };
  this.body = information;
};

const vote = function *() {
  let info = this.request.body;
  let connection = yield mysql.getConnection();
  let code, response;
  if (info.vote === 1) {
    let likes = yield connection.query('select likes from Posts where id = ?;', [info.post]);
    if (likes.length === 0) {
      code = 1;
      response = {};
    } else {
      ++likes[0].likes;
      yield connection.query('update Posts set likes = ? where id = ?;', [likes[0].likes, info.post]);
      code = 0;
      response = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, isHighlighted' +
        ' isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where id = ?;',
        [info.post]);
    }
  } else {
    let dislikes = yield connection.query('select dislikes from Posts where id = ?;', [info.post]);
    if (dislikes.length === 0) {
      code = 1;
      response = {};
    } else {
      ++dislikes[0].dislikes;
      yield connection.query('update Posts set dislikes = ? where id = ?;', [dislikes[0].dislikes, info.post]);
      code = 0;
      response = yield connection.query('select date, dislikes, forum, id, isApproved, isDeleted, isEdited, isHighlighted' +
        ' isSpam, likes, message, parent, likes - dislikes as points, thread, user from Posts where id = ?;', [info.post]);
    }
  }
  let information = {
    code: code,
    response: response
  };
  this.body = information;
};

module.exports.create = create;
module.exports.details = details;
module.exports.list = list;
module.exports.remove = remove;
module.exports.restore = restore;
module.exports.update = update;
module.exports.vote = vote;
