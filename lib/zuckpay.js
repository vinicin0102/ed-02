/**
 * Cliente da ZuckPay (API v3).
 *
 * As credenciais NUNCA aparecem aqui em texto puro: vem de variaveis de
 * ambiente. Este arquivo roda somente no servidor.
 *
 *   ZUCKPAY_CLIENT_ID      (painel ZuckPay > Desenvolvedores > Credenciais API)
 *   ZUCKPAY_CLIENT_SECRET
 *   ZUCKPAY_BASE_URL       (opcional, padrao https://www.zuckpay.com.br/conta)
 *
 * Endpoints usados:
 *   POST /v3/pix/qrcode  -> cria a cobranca, devolve copia e cola + QR Code
 *   GET  /v3/pix/status  -> fonte da verdade do pagamento (polling)
 */

const BASE_URL = (process.env.ZUCKPAY_BASE_URL || 'https://www.zuckpay.com.br/conta').replace(/\/$/, '');

function authHeader() {
    const id = process.env.ZUCKPAY_CLIENT_ID || process.env.CLIENT_ID;
    const secret = process.env.ZUCKPAY_CLIENT_SECRET || process.env.CLIENT_SECRET;
    if (!id || !secret) {
        throw new Error('ZUCKPAY_CLIENT_ID / ZUCKPAY_CLIENT_SECRET nao configurados');
    }
    return 'Basic ' + Buffer.from(`${id}:${secret}`, 'utf8').toString('base64');
}

function configurada() {
    return Boolean(
        (process.env.ZUCKPAY_CLIENT_ID || process.env.CLIENT_ID) &&
        (process.env.ZUCKPAY_CLIENT_SECRET || process.env.CLIENT_SECRET)
    );
}

async function zp(method, path, { query, body } = {}) {
    const url = new URL(BASE_URL + path);
    for (const [k, v] of Object.entries(query || {})) url.searchParams.set(k, v);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: authHeader(),
                Accept: 'application/json',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            // sem "www" o CDN faz 301 e converte POST em GET
            redirect: 'error',
            signal: controller.signal
        });

        const texto = await res.text();
        let dados = {};
        try {
            dados = texto ? JSON.parse(texto) : {};
        } catch (e) {
            throw new Error(`ZuckPay respondeu ${res.status} com corpo nao-JSON`);
        }

        if (!res.ok) {
            const msg = dados.message || dados.error;
            console.error('[zuckpay]', method, path, res.status, msg || '');
            const erro = new Error(`ZuckPay respondeu ${res.status}${msg ? ': ' + msg : ''}`);
            erro.status = res.status;
            throw erro;
        }

        return dados;
    } finally {
        clearTimeout(timer);
    }
}

/** Le a primeira chave preenchida (a resposta varia entre versoes). */
function campo(obj, ...chaves) {
    for (const k of chaves) {
        const v = obj[k];
        if (typeof v === 'string' && v) return v;
        if (typeof v === 'number') return String(v);
    }
    return null;
}

/** PENDING | APPROVED | FAILED | REFUNDED */
function mapearStatus(s) {
    switch (String(s || '').toUpperCase()) {
        case 'PAID':
        case 'APPROVED':
        case 'COMPLETED':
            return 'APPROVED';
        case 'FAILED':
        case 'REFUSED':
        case 'EXPIRED':
        case 'EXPIRADO':
        case 'CANCELED':
        case 'CANCELLED':
            return 'FAILED';
        case 'REFUNDED':
        case 'CHARGEBACK':
            return 'REFUNDED';
        default:
            return 'PENDING';
    }
}

/**
 * Cria a cobranca PIX.
 * `valorCentavos` e convertido para reais, que e o formato que a API espera.
 */
async function criarPix({ valorCentavos, descricao, cliente, externalId, urlNotificacao }) {
    const body = {
        nome: cliente.nome,
        email: cliente.email,
        cpf: cliente.cpf,
        telefone: cliente.telefone,
        valor: Number((valorCentavos / 100).toFixed(2)),
        descricao: String(descricao).slice(0, 255),
        // idempotencia: repetir devolve a mesma cobranca pendente
        external_id_client: externalId
    };

    if (urlNotificacao && urlNotificacao.startsWith('https://')) {
        body.urlnoty = urlNotificacao;
    }

    const dados = await zp('POST', '/v3/pix/qrcode', { body });

    return {
        transactionId: campo(dados, 'transactionId', 'transaction_id', 'id'),
        copiaECola: campo(dados, 'qrcode'),
        qrcodeImagem: campo(dados, 'qrcode_image'),
        checkoutUrl: campo(dados, 'checkout_url')
    };
}

/** Consulta o status na API — e esta a fonte da verdade, nao o webhook. */
async function consultarStatus(transactionId) {
    const dados = await zp('GET', '/v3/pix/status', { query: { transactionId } });
    return {
        transactionId: campo(dados, 'transactionId', 'transaction_id', 'id') || transactionId,
        status: mapearStatus(campo(dados, 'status')),
        externalId: campo(dados, 'external_id_client')
    };
}

module.exports = { criarPix, consultarStatus, mapearStatus, configurada };
