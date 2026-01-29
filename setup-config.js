/**
 * =====================================================
 * 🚀 SCRIPT DE CONFIGURAÇÃO DO FUNIL MOUNJATINA
 * =====================================================
 * 
 * Este script configura o localStorage com os valores 
 * corretos para o timing do CTA e provas sociais.
 * 
 * COMO USAR:
 * 1. Abra o navegador na página do funil (vsl.html ou index.html)
 * 2. Abra o Console (F12 > Console)
 * 3. Cole e execute este código
 * 
 * Ou: inclua este script na página admin.html
 */

(function () {
    'use strict';

    // ===================================================
    // 📌 CONFIGURAÇÃO PRINCIPAL - EDITE AQUI
    // ===================================================

    const CONFIG = {
        // ⏱️ TIMING DO PITCH (quando CTA e provas sociais aparecem)
        ctaMin: 2,               // Minutos: 2
        ctaSec: 44,              // Segundos: 44
        // Total: 2 minutos e 44 segundos (164 segundos)

        // 📹 EMBED DO VÍDEO (opcional - deixe vazio para usar placeholder)
        vslEmbed: '',

        // 📝 HEADLINE PERSONALIZADA (opcional)
        vslHeadline: '',

        // 🔗 LINKS DE CHECKOUT
        linkMain: 'https://pay.kiwify.com.br/SEU-LINK-PRINCIPAL',
        linkUpsell: 'https://pay.kiwify.com.br/SEU-LINK-UPSELL',
        linkDownsell: 'https://pay.kiwify.com.br/SEU-LINK-DOWNSELL',

        // 💬 LINK WHATSAPP/GRUPO VIP
        linkWhatsapp: 'https://chat.whatsapp.com/SEU-GRUPO'
    };

    // ===================================================
    // 🔧 APLICAR CONFIGURAÇÃO
    // ===================================================

    // Salvar no localStorage
    localStorage.setItem('funnelConfig', JSON.stringify(CONFIG));

    // Verificação
    const saved = JSON.parse(localStorage.getItem('funnelConfig'));

    console.log('%c✅ CONFIGURAÇÃO APLICADA COM SUCESSO!', 'color: #16a34a; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%c⏱️ Delay do CTA:', 'color: #8b5cf6; font-weight: bold;', `${saved.ctaMin} min ${saved.ctaSec} seg`);
    console.log('%c📊 Total em segundos:', 'color: #2563eb;', (saved.ctaMin * 60) + parseInt(saved.ctaSec), 'segundos');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%c🔄 Recarregue a página (F5) para aplicar as mudanças!', 'color: #f59e0b; font-weight: bold;');

    // Retornar configuração para visualização
    return saved;

})();
