// based on https://adamcoster.com/blog/create-a-live-reload-server-for-front-end-development

import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// constants
const HTTP_PORT = 8080;
const WEBSOCKET_PORT = 8090;

// useful commonjs functions
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// start local websocket server
const wss = new WebSocketServer({
    port: WEBSOCKET_PORT,
});

// watch for file changes
const watch = (dir, callback) => {
    fs.watch(dir, { recursive: true }, (event, filename) => {
        if (filename) {
            console.log('file changed: ' + filename);
            callback();
        } else {
            console.log('filename not provided');
        }
    })
};

// connection listener
wss.on('connection', (ws) => {
    ws.on('error', console.error);

    ws.on('message', function message(data) {
        console.log('received: %s', data);
    });

    // send a reload message to connected clients when a file changes
    watch(`${__dirname}/public`, () => {
        ws.send('reload');
    });
});

// handle static file requests
const requestHandler = (req, res) => {
    const method = req.method.toLowerCase();
    if (method == 'get') {
        let route = path.normalize(path.join(__dirname, 'public', req.url));
        if (fs.statSync(route).isDirectory()) {
            route = path.join(route, 'resume.html');
        }
        const file = fs.readFileSync(route);
        res.writeHead(200);
        res.end(`${file}\n\n
            <script>
                const socket = new WebSocket('ws://localhost:${WEBSOCKET_PORT}');
                socket.addEventListener('message', (event) => {
                    if (event.data === 'reload') {
                        location.reload();
                    }
                });
            </script>
            `
        );
    }
};

// start local http server and listen
const server = http.createServer(requestHandler);
server.listen(HTTP_PORT, () => {
    console.log(`listening on http://localhost:${HTTP_PORT}`);
});