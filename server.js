'use strict'

const http = require('http');
const url = require('url');
const qs = require('querystring');
const apiQuery = require('./class/api-query');

const server = http.createServer((req, res) => {
	const reqUrl = url.parse(req.url);
	const query = (reqUrl.query)?qs.parse(reqUrl.query):null;
	const path = reqUrl.pathname.split('/');
	const method = req.method.toLowerCase();

    const api = new apiQuery(method, path, query);
    console.log();
    console.log(`[${req.method}]`, reqUrl.pathname);

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

            const result = api.exec(body);
        	res.writeHead(result.error || 200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(result.text) || 
				JSON.stringify({
					code: result.error,
					error: http.STATUS_CODES[result.error]
				}));
        });
    }
    else {
        console.log('query: ', query);

        const result = api.exec();
        res.writeHead(result.error || 200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(result.text) || 
				JSON.stringify({
					code: result.error,
					error: http.STATUS_CODES[result.error]
				}));
    }
})

server.on('clientError', (err, socket) => {
	socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(5000);
