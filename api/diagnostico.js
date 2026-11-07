/**
 * GET /api/diagnostico  (funcao serverless da Vercel)
 *
 * Diz o que ainda falta configurar, sem expor nenhum segredo:
 * so informa se cada variavel existe.
 */

const { diagnostico } = require('../lib/checkout');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ erro: 'Metodo nao permitido.' });
    }

    const { status, corpo } = diagnostico();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(corpo);
};
