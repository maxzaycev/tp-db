'use strict';

const http = require('http');
const url = require('url');
const qs = require('querystring');

const Router = require('./class/router');

function responseError(res, error){
    res.writeHead(error, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
        code: error,
        error: http.STATUS_CODES[error]
    }));
}

function response(res, promise){
    res.writeHead(200, {'Content-Type': 'application/json'});
    promise.then((body) => {
        res.end(JSON.stringify(body));
    });
}

const server = http.createServer((req, res) => {
	const reqUrl = url.parse(req.url);
	const query = (reqUrl.query)?qs.parse(reqUrl.query):null;
	const path = reqUrl.pathname.split('/');
	const method = req.method.toLowerCase();
    
    console.log();
    console.log(`[${req.method}]`, reqUrl.pathname);

    const router = new Router(method, path, query);

		//data
    if (method === 'post') {
        let body = '';

        req.on('data', (data)=>{
            body += data;

            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', ()=>{
            console.log('body: ', body);

            const result = router.route(body);
            (result.error)?
                responseError(res, result.error):
                response(res, result.promise);
        });
    }
    else {
        console.log('query: ', query);

        const result = router.route();
        (result.error)?
            responseError(res, result.error):
            response(res, result.promise);
    }
});

server.on('clientError', (err, socket) => {
	socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(5000);
