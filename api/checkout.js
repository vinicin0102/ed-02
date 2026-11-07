/**
 * POST /api/checkout  (funcao serverless da Vercel)
 *
 * Corpo esperado:
 *   { plano: "amostra" | "kit4",
 *     cliente: { nome, email, cpf, telefone },
 *     endereco: { cep, rua, numero, bairro, cidade, uf } }
 *
 * O navegador NAO envia valor: o preco sai de lib/checkout.js.
 */

const { criarPedido } = require('../lib/checkout');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ erro: 'Metodo nao permitido.' });
    }

    let pedido;
    try {
        pedido = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (e) {
        return res.status(400).json({ erro: 'Pedido invalido.' });
    }

    /* Só manda o postback se a URL estiver configurada de propósito.
     * Ainda não existe endpoint de webhook aqui: a confirmação vem do
     * polling em /api/status, que consulta a API autenticada. */
    const { status, corpo } = await criarPedido(pedido, process.env.ZUCKPAY_WEBHOOK_URL);
    return res.status(status).json(corpo);
};
