/**
 * Servidor local (desenvolvimento).
 *
 * Em producao quem atende /api/* sao as funcoes serverless da Vercel,
 * em api/*.js. Este arquivo existe so para rodar o funil na maquina e
 * usa EXATAMENTE as mesmas regras, de lib/checkout.js, para o que voce
 * testa aqui ser o que acontece no ar.
 *
 *   node --env-file-if-exists=.env server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { criarPedido, statusPedido, diagnostico } = require('./lib/checkout');

const port = process.env.PORT || 9000;
const root = __dirname;

function responderJson(res, status, corpo) {
    const texto = JSON.stringify(corpo);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(texto),
        'Cache-Control': 'no-store'
    });
    res.end(texto);
}

function lerCorpo(req) {
    return new Promise((resolve, reject) => {
        const partes = [];
        let total = 0;
        req.on('data', (parte) => {
            total += parte.length;
            if (total > 64 * 1024) {
                reject(new Error('corpo grande demais'));
                req.destroy();
                return;
            }
            partes.push(parte);
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(partes).toString('utf-8') || '{}'));
            } catch (e) {
                reject(new Error('json invalido'));
            }
        });
        req.on('error', reject);
    });
}

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

const server = http.createServer(async (req, res) => {
    const partes = req.url.split('?');
    const cleanUrl = decodeURIComponent(partes[0]);
    const query = new URLSearchParams(partes[1] || '');

    if (cleanUrl === '/api/checkout') {
        if (req.method !== 'POST') {
            responderJson(res, 405, { erro: 'Metodo nao permitido.' });
            return;
        }
        let pedido;
        try {
            pedido = await lerCorpo(req);
        } catch (e) {
            responderJson(res, 400, { erro: 'Pedido invalido.' });
            return;
        }
        const r = await criarPedido(pedido, process.env.ZUCKPAY_WEBHOOK_URL);
        responderJson(res, r.status, r.corpo);
        return;
    }

    if (cleanUrl === '/api/status') {
        if (req.method !== 'GET') {
            responderJson(res, 405, { erro: 'Metodo nao permitido.' });
            return;
        }
        const r = await statusPedido(query.get('transactionId') || '');
        responderJson(res, r.status, r.corpo);
        return;
    }

    if (cleanUrl === '/api/diagnostico') {
        const r = diagnostico();
        responderJson(res, r.status, r.corpo);
        return;
    }

    const relative = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
    const filePath = path.join(root, relative);

    // Nao serve nada fora da pasta do projeto
    if (!filePath.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>', 'utf-8');
        return;
    }

    const contentType = mimeTypes[String(path.extname(filePath)).toLowerCase()] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Erro: ' + error.code + '\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
    const d = diagnostico().corpo;
    if (!d.pixPronto) {
        console.log('[checkout] ZuckPay ainda nao configurada: falta ' + d.faltando.join(', '));
    }
});
