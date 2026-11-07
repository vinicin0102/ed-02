const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 9000;
const root = __dirname;

const server = http.createServer((req, res) => {
    // Remove query strings (ex: ?v=2.1)
    const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
    const relative = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
    const filePath = path.join(root, relative);

    // Nao serve nada fora da pasta do projeto
    if (!filePath.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>', 'utf-8');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end("<h1>404 Not Found</h1>", 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
});
