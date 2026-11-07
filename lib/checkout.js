/**
 * Regras do checkout, sem nada de HTTP.
 *
 * As funcoes daqui devolvem { status, corpo } e sao usadas pelos dois
 * ambientes: as funcoes serverless da Vercel (api/*.js) e o servidor
 * local (server.js). Assim a producao e o ambiente local nao divergem.
 */

const crypto = require('crypto');
const zuckpay = require('./zuckpay');

/* FONTE DA VERDADE DO PRECO.
 * O navegador manda so o id do plano, nunca o valor. */
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

/** Cria a cobranca PIX. `urlWebhook` e opcional. */
async function criarPedido(pedido, urlWebhook) {
    const plano = PLANOS[pedido && pedido.plano];
    if (!plano) {
        return { status: 400, corpo: { erro: 'Plano nao reconhecido.' } };
    }

    const cliente = pedido.cliente || {};
    const endereco = pedido.endereco || {};
    const erros = validarPedido(cliente, endereco);

    if (erros.length) {
        return { status: 422, corpo: { erro: 'Confira estes campos: ' + erros.join(', ') + '.' } };
    }

    if (!zuckpay.configurada()) {
        console.error('[checkout] ZuckPay nao configurada. Defina ZUCKPAY_CLIENT_ID e ZUCKPAY_CLIENT_SECRET.');
        return { status: 503, corpo: { erro: 'Pagamento indisponivel no momento. Tente novamente em instantes.' } };
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
            urlNotificacao: urlWebhook
        });

        if (!pix.copiaECola) {
            console.error('[checkout] a ZuckPay nao devolveu o copia e cola.');
            return { status: 502, corpo: { erro: 'Nao foi possivel gerar o PIX agora. Tente novamente.' } };
        }

        /* O endereco de entrega NAO vai para a ZuckPay (a API de PIX nao
         * recebe endereco). Fica no log para o despacho. */
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

        return {
            status: 201,
            corpo: {
                transactionId: pix.transactionId,
                copiaECola: pix.copiaECola,
                qrcodeImagem: pix.qrcodeImagem,
                valorCentavos: plano.valorCentavos,
                plano: pedido.plano
            }
        };
    } catch (e) {
        console.error('[checkout] falhou:', e.message);
        return { status: 502, corpo: { erro: 'Nao foi possivel gerar o PIX agora. Tente novamente.' } };
    }
}

/** Consulta o pagamento. Devolve so o status, nenhum dado do comprador. */
async function statusPedido(transactionId) {
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(String(transactionId || ''))) {
        return { status: 400, corpo: { erro: 'transactionId invalido.' } };
    }

    if (!zuckpay.configurada()) {
        return { status: 503, corpo: { erro: 'Pagamento indisponivel no momento.' } };
    }

    try {
        const info = await zuckpay.consultarStatus(transactionId);
        return { status: 200, corpo: { status: info.status } };
    } catch (e) {
        console.error('[status] falhou:', e.message);
        return { status: 502, corpo: { erro: 'Nao foi possivel consultar o pagamento.' } };
    }
}

/** O que ainda falta configurar. Nao devolve nenhum segredo. */
function diagnostico() {
    const tem = (nome) => Boolean(process.env[nome]);
    const faltando = [];

    if (!tem('ZUCKPAY_CLIENT_ID') && !tem('CLIENT_ID')) faltando.push('ZUCKPAY_CLIENT_ID');
    if (!tem('ZUCKPAY_CLIENT_SECRET') && !tem('CLIENT_SECRET')) faltando.push('ZUCKPAY_CLIENT_SECRET');

    return {
        status: 200,
        corpo: {
            pixPronto: faltando.length === 0,
            faltando,
            ambiente: process.env.VERCEL ? 'vercel (' + (process.env.VERCEL_ENV || 'desconhecido') + ')' : 'local',
            baseUrl: process.env.ZUCKPAY_BASE_URL || 'https://www.zuckpay.com.br/conta (padrao)',
            webhook: process.env.ZUCKPAY_WEBHOOK_URL || 'nao configurado (a pagina consulta o status mesmo assim)',
            planos: Object.keys(PLANOS).map((id) => ({ id, valorCentavos: PLANOS[id].valorCentavos })),
            comoResolver: faltando.length
                ? 'Defina as variaveis no painel da Vercel (ou no .env, para rodar local).'
                : 'Tudo configurado.'
        }
    };
}

module.exports = { PLANOS, criarPedido, statusPedido, diagnostico, validarPedido };
