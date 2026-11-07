const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 9000;
const root = __dirname;

/* =====================================================
 * ZUUCKY - CONFIGURACAO
 * =====================================================
 * A chave fica aqui no servidor, NUNCA no HTML.
 * Defina as variaveis de ambiente antes de subir:
 *
 *   ZUUCKY_API_URL=https://...            (endpoint de criacao de pedido)
 *   ZUUCKY_API_KEY=...                    (chave secreta)
 *   ZUUCKY_OFFER_AMOSTRA=...              (id da oferta da amostra)
 *   ZUUCKY_OFFER_KIT4=...                 (id da oferta do kit 4 meses)
 */
const ZUUCKY = {
    apiUrl: process.env.ZUUCKY_API_URL || '',
    apiKey: process.env.ZUUCKY_API_KEY || ''
};

const PLANOS = {
    amostra: {
        nome: 'Amostra Gratis - Honey Booster (frete)',
        valorCentavos: 2290,
        offerId: process.env.ZUUCKY_OFFER_AMOSTRA || ''
    },
    kit4: {
        nome: 'Kit 4 Meses - Honey Booster',
        valorCentavos: 4780,
        offerId: process.env.ZUUCKY_OFFER_KIT4 || ''
    }
};

/* Monta o corpo enviado a Zuucky.
 * ATENCAO: os nomes dos campos abaixo seguem o formato mais comum de
 * gateway brasileiro. Confira a documentacao da Zuucky e ajuste AQUI,
 * num lugar so, se os nomes forem outros. */
function montarPedidoZuucky(plano, cliente, endereco) {
    return {
        offer_id: plano.offerId,
        amount: plano.valorCentavos,
        description: plano.nome,
        customer: {
            name: cliente.nome,
            email: cliente.email,
            document: cliente.cpf,
            phone: cliente.telefone
        },
        shipping: {
            zip_code: endereco.cep,
            street: endereco.rua,
            number: endereco.numero,
            neighborhood: endereco.bairro,
            city: endereco.cidade,
            state: endereco.uf
        }
    };
}

/* A resposta tambem varia por gateway: procura a URL em varios campos. */
function extrairCheckoutUrl(resposta) {
    if (!resposta || typeof resposta !== 'object') return '';
    return resposta.checkout_url
        || resposta.checkoutUrl
        || resposta.payment_url
        || resposta.url
        || (resposta.data && extrairCheckoutUrl(resposta.data))
        || '';
}

function responderJson(res, status, corpo) {
    const texto = JSON.stringify(corpo);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(texto)
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

function campoVazio(valor) {
    return typeof valor !== 'string' || valor.trim() === '';
}

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

    const faltando = ['nome', 'email', 'cpf', 'telefone'].filter((c) => campoVazio(cliente[c]))
        .concat(['cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'].filter((c) => campoVazio(endereco[c])));

    if (faltando.length) {
        responderJson(res, 400, { erro: 'Preencha todos os campos: ' + faltando.join(', ') + '.' });
        return;
    }

    if (!ZUUCKY.apiUrl || !ZUUCKY.apiKey || !plano.offerId) {
        console.error('[checkout] Zuucky nao configurada. Defina ZUUCKY_API_URL, ZUUCKY_API_KEY e o id da oferta.');
        responderJson(res, 503, {
            erro: 'Pagamento indisponivel no momento. Tente novamente em instantes.'
        });
        return;
    }

    try {
        const resposta = await fetch(ZUUCKY.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + ZUUCKY.apiKey
            },
            body: JSON.stringify(montarPedidoZuucky(plano, cliente, endereco))
        });

        const dados = await resposta.json().catch(() => ({}));
        const checkoutUrl = extrairCheckoutUrl(dados);

        if (!resposta.ok || !checkoutUrl) {
            console.error('[checkout] Zuucky respondeu', resposta.status, JSON.stringify(dados).slice(0, 500));
            responderJson(res, 502, { erro: 'Nao foi possivel abrir o pagamento. Tente novamente.' });
            return;
        }

        responderJson(res, 200, { checkoutUrl });
    } catch (e) {
        console.error('[checkout] falha ao chamar a Zuucky:', e.message);
        responderJson(res, 502, { erro: 'Nao foi possivel abrir o pagamento. Tente novamente.' });
    }
}

const server = http.createServer((req, res) => {
    // Remove query strings (ex: ?v=2.1)
    const cleanUrl = decodeURIComponent(req.url.split('?')[0]);

    // API de checkout
    if (cleanUrl === '/api/checkout') {
        if (req.method !== 'POST') {
            responderJson(res, 405, { erro: 'Metodo nao permitido.' });
            return;
        }
        criarCheckout(req, res);
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
    if (!ZUUCKY.apiUrl || !ZUUCKY.apiKey) {
        console.log('[checkout] Zuucky ainda nao configurada (ZUUCKY_API_URL / ZUUCKY_API_KEY).');
    }
});
