'use strict'
const http = require('http');
const url = require('url');
const qs = require('querystring');

const server = http.createServer((req, res) => {
	const reqUrl = url.parse(req.url);
	const query = (reqUrl.query)?qs.parse(reqUrl.query):null;
	const path = reqUrl.pathname;
	const method = req.method;

	if (req.method == 'POST') {
        let body = '';

        req.on('data', function (data) {
            body += data;

            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {
            let post = qs.parse(body);
            console.log('[BODY]', post);
        });
    }
    
	console.log('['+method+']', path, query);

	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify({}));
})

server.on('clientError', (err, socket) => {
	socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(5000);
