/**
 * GET /api/status?transactionId=...  (funcao serverless da Vercel)
 *
 * Consultado em polling enquanto a tela do PIX esta aberta.
 * Devolve so o status — nada de dados do comprador.
 */

const { statusPedido } = require('../lib/checkout');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ erro: 'Metodo nao permitido.' });
    }

    const transactionId = String((req.query && req.query.transactionId) || '').trim();

    const { status, corpo } = await statusPedido(transactionId);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(corpo);
};
