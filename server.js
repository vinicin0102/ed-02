const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const zuckpay = require('./zuckpay');

const port = process.env.PORT || 9000;
const root = __dirname;

/* =====================================================
 * PLANOS - FONTE DA VERDADE DO PRECO
 * =====================================================
 * O navegador NUNCA envia valor: manda so o id do plano.
 */
const PLANOS = {
    amostra: {
        nome: 'Amostra Gratis Honey Booster (frete)',
        valorCentavos: 2290
    },
    kit4: {
        nome: 'Kit 4 Meses Honey Booster',
        valorCentavos: 4780
    }
};

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

function textoVazio(valor) {
    return typeof valor !== 'string' || valor.trim() === '';
}

function validarPedido(cliente, endereco) {
    const erros = [];

    if (textoVazio(cliente.nome) || cliente.nome.trim().length < 3) erros.push('nome');
    if (textoVazio(cliente.email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) erros.push('e-mail');
    if (String(cliente.cpf || '').length !== 11) erros.push('CPF');
    if (String(cliente.telefone || '').length < 10) erros.push('telefone');

    for (const campo of ['cep', 'rua', 'numero', 'bairro', 'cidade', 'uf']) {
        if (textoVazio(endereco[campo])) erros.push(campo);
    }

    return erros;
}

/* =====================================================
 * POST /api/checkout - cria a cobranca PIX na ZuckPay
 * ===================================================== */
async function criarCheckout(req, res) {
    let pedido;
    try {
        pedido = await lerCorpo(req);
    } catch (e) {
        responderJson(res, 400, { erro: 'Pedido invalido.' });
        return;
    }

    const plano = PLANOS[pedido.plano];
    if (!plano) {
        responderJson(res, 400, { erro: 'Plano nao reconhecido.' });
        return;
    }

    const cliente = pedido.cliente || {};
    const endereco = pedido.endereco || {};
    const erros = validarPedido(cliente, endereco);

    if (erros.length) {
        responderJson(res, 422, { erro: 'Confira estes campos: ' + erros.join(', ') + '.' });
        return;
    }

    if (!zuckpay.configurada()) {
        console.error('[checkout] ZuckPay nao configurada. Defina ZUCKPAY_CLIENT_ID e ZUCKPAY_CLIENT_SECRET.');
        responderJson(res, 503, { erro: 'Pagamento indisponivel no momento. Tente novamente em instantes.' });
        return;
    }

    const externalId = 'ed02-' + crypto.randomUUID();

    try {
        const pix = await zuckpay.criarPix({
            valorCentavos: plano.valorCentavos,
            descricao: plano.nome,
            cliente: {
                nome: cliente.nome.trim(),
                email: cliente.email.trim(),
                cpf: String(cliente.cpf),
                telefone: String(cliente.telefone)
            },
            externalId,
            urlNotificacao: process.env.ZUCKPAY_WEBHOOK_URL
        });

        if (!pix.copiaECola) {
            console.error('[checkout] a ZuckPay nao devolveu o copia e cola.');
            responderJson(res, 502, { erro: 'Nao foi possivel gerar o PIX agora. Tente novamente.' });
            return;
        }

        /* O endereco de entrega NAO vai para a ZuckPay (a API de PIX nao
         * recebe endereco). Fica registrado aqui para o despacho. */
        console.log('[pedido]', JSON.stringify({
            externalId,
            transactionId: pix.transactionId,
            plano: pedido.plano,
            valorCentavos: plano.valorCentavos,
            entrega: {
                nome: cliente.nome.trim(),
                telefone: String(cliente.telefone),
                cep: endereco.cep,
                rua: endereco.rua,
                numero: endereco.numero,
                bairro: endereco.bairro,
                cidade: endereco.cidade,
                uf: endereco.uf
            }
        }));

        responderJson(res, 201, {
            transactionId: pix.transactionId,
            copiaECola: pix.copiaECola,
            qrcodeImagem: pix.qrcodeImagem,
            valorCentavos: plano.valorCentavos,
            plano: pedido.plano
        });
    } catch (e) {
        console.error('[checkout] falhou:', e.message);
        responderJson(res, 502, { erro: 'Nao foi possivel gerar o PIX agora. Tente novamente.' });
    }
}

/* =====================================================
 * GET /api/status?transactionId=... - polling do pagamento
 * ===================================================== */
async function consultarStatus(req, res, query) {
    const transactionId = query.get('transactionId') || '';

    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(transactionId)) {
        responderJson(res, 400, { erro: 'transactionId invalido.' });
        return;
    }

    if (!zuckpay.configurada()) {
        responderJson(res, 503, { erro: 'Pagamento indisponivel no momento.' });
        return;
    }

    try {
        const info = await zuckpay.consultarStatus(transactionId);
        responderJson(res, 200, { status: info.status });
    } catch (e) {
        console.error('[status] falhou:', e.message);
        responderJson(res, 502, { erro: 'Nao foi possivel consultar o pagamento.' });
    }
}

/* =====================================================
 * GET /api/diagnostico - o que ainda falta configurar
 * =====================================================
 * Nao devolve nenhum segredo: so diz se cada variavel existe. */
function diagnostico(res) {
    const tem = (nome) => Boolean(process.env[nome]);
    const faltando = [];

    if (!tem('ZUCKPAY_CLIENT_ID') && !tem('CLIENT_ID')) faltando.push('ZUCKPAY_CLIENT_ID');
    if (!tem('ZUCKPAY_CLIENT_SECRET') && !tem('CLIENT_SECRET')) faltando.push('ZUCKPAY_CLIENT_SECRET');

    responderJson(res, 200, {
        pixPronto: faltando.length === 0,
        faltando,
        baseUrl: process.env.ZUCKPAY_BASE_URL || 'https://www.zuckpay.com.br/conta (padrao)',
        webhook: process.env.ZUCKPAY_WEBHOOK_URL || 'nao configurado (a pagina consulta o status mesmo assim)',
        planos: Object.keys(PLANOS).map((id) => ({ id, valorCentavos: PLANOS[id].valorCentavos })),
        comoResolver: faltando.length
            ? 'Preencha o .env (veja .env.example) e suba com: node --env-file=.env server.js'
            : 'Tudo configurado.'
    });
}

const server = http.createServer((req, res) => {
    const partes = req.url.split('?');
    const cleanUrl = decodeURIComponent(partes[0]);
    const query = new URLSearchParams(partes[1] || '');

    if (cleanUrl === '/api/checkout') {
        if (req.method !== 'POST') {
            responderJson(res, 405, { erro: 'Metodo nao permitido.' });
            return;
        }
        criarCheckout(req, res);
        return;
    }

    if (cleanUrl === '/api/diagnostico') {
        diagnostico(res);
        return;
    }

    if (cleanUrl === '/api/status') {
        if (req.method !== 'GET') {
            responderJson(res, 405, { erro: 'Metodo nao permitido.' });
            return;
        }
        consultarStatus(req, res, query);
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
    if (!zuckpay.configurada()) {
        console.log('[checkout] ZuckPay ainda nao configurada (ZUCKPAY_CLIENT_ID / ZUCKPAY_CLIENT_SECRET).');
    }
});
