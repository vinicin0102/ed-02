/**
 * =====================================================
 * 🚀 SCRIPT PRINCIPAL DO FUNIL MOUNJATINA
 * =====================================================
 * 
 * Este script gerencia:
 * - Timing do CTA (botão de compra)
 * - Links dinâmicos
 * - Embed de vídeo
 * - Funcionalidades gerais
 */

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // OBTER CONFIGURAÇÃO (config.js > localStorage)
    // ============================================
    let finalConfig;

    // Prioridade: getFunnelConfig() do config.js > localStorage > defaults
    if (typeof getFunnelConfig === 'function') {
        finalConfig = getFunnelConfig();
    } else {
        // Fallback para localStorage
        const localConfig = JSON.parse(localStorage.getItem('funnelConfig') || '{}');
        const defaultConfig = {
            ctaMin: 2,
            ctaSec: 44,
            linkMain: 'https://pay.kiwify.com.br/SEU-LINK',
            linkUpsell: 'obrigado.html',
            linkDownsell: 'obrigado.html',
            linkWhatsapp: '#'
        };
        finalConfig = { ...defaultConfig, ...localConfig };
    }

    console.log('%c📊 Configurações Carregadas:', 'color: #8b5cf6; font-weight: bold;', finalConfig);

    // ============================================
    // 1. VÍDEO E HEADLINE (REMOVIDO PARA EVITAR CONFLITO COM HARDCODED DO VSL.HTML)
    // ============================================
    // O código anterior substituía o conteúdo estático pelo config.js/localStorage.
    // Como queremos fixar a nova oferta, removemos essa lógica dinâmica.


    // ============================================
    // 3. ATUALIZAÇÃO DE LINKS
    // ============================================

    // Botão Principal
    const btnMain = document.querySelector('.cta-button');
    if (btnMain && finalConfig.linkMain && finalConfig.linkMain !== 'https://pay.kiwify.com.br/SEU-LINK-PRINCIPAL') {
        btnMain.href = finalConfig.linkMain;
    }

    // Botão por ID
    const btnMainById = document.getElementById('btn-main');
    if (btnMainById && finalConfig.linkMain && finalConfig.linkMain !== 'https://pay.kiwify.com.br/SEU-LINK-PRINCIPAL') {
        btnMainById.href = finalConfig.linkMain;
    }

    // Botão Upsell (Sim)
    const btnYes = document.querySelector('.btn-yes');
    if (btnYes) {
        if (window.location.pathname.includes('upsell') && finalConfig.linkUpsell) {
            btnYes.href = finalConfig.linkUpsell;
        }
        if (window.location.pathname.includes('downsell') && finalConfig.linkDownsell) {
            btnYes.href = finalConfig.linkDownsell;
        }
    }

    // Link WhatsApp
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp && finalConfig.linkWhatsapp) {
        btnWhatsapp.href = finalConfig.linkWhatsapp;
    }

    // ============================================
    // 2. DELAY DO BOTÃO CTA (Hardcoded: 6min 33s)
    // ============================================
    const ctaContainer = document.getElementById('cta-container');
    const socialProofSection = document.getElementById('social-proof-section');

    if (ctaContainer) {
        // HARDCODED DELAY: 6 minutes and 33 seconds
        const min = 6;
        const sec = 33;
        const delayMs = ((min * 60) + sec) * 1000;

        console.log(`%c⏱️ Delay CTA e Provas Sociais INICIADO: ${delayMs}ms (${min}m ${sec}s)`, 'color: #16a34a; font-weight: bold;');

        // 1. Garantir que começa escondido (caso o CSS não tenha pego)
        ctaContainer.classList.add('hidden-pitch');
        ctaContainer.style.display = 'none';
        ctaContainer.style.opacity = '0';

        if (socialProofSection) {
            socialProofSection.classList.add('hidden-pitch');
            socialProofSection.style.display = 'none';
            socialProofSection.style.opacity = '0';
        }

        // 2. Agendar o aparecimento
        setTimeout(() => {
            console.log('%c✅ Mostrando Oferta Agora!', 'color: #16a34a; font-weight: bold;');

            // Revelar CTA
            ctaContainer.style.display = 'block';
            ctaContainer.classList.remove('hidden-pitch');

            // Revelar Provas Sociais
            if (socialProofSection) {
                socialProofSection.style.display = 'block';
                socialProofSection.classList.remove('hidden-pitch');
            }

            // Animar entrada (fade in)
            setTimeout(() => {
                ctaContainer.style.opacity = '1';
                ctaContainer.style.transition = 'opacity 1s ease-out';

                if (socialProofSection) {
                    socialProofSection.style.opacity = '1';
                    socialProofSection.style.transition = 'opacity 1s ease-out';
                }
            }, 100);

            // Scroll suave para o CTA
            // ctaContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Opcional, as vezes irrita o usuario

            // Iniciar notificações de compra fake
            startFakeNotifications();

        }, delayMs);
    }

    // ============================================
    // 8. NOTIFICAÇÕES DE COMPRA (SOCIAL PROOF)
    // ============================================
    function startFakeNotifications() {
        const names = [
            'Pedro', 'João', 'Carlos', 'Marcos', 'Rafael', 'Lucas', 'Mateus', 'Gabriel',
            'Felipe', 'André', 'Luiz', 'Gustavo', 'Rodrigo', 'Bruno', 'Daniel',
            'Eduardo', 'Leonardo', 'Fernando', 'Ricardo', 'Marcelo', 'Antônio',
            'Francisco', 'Paulo', 'Roberto', 'Sérgio', 'Alexandre', 'Diego',
            'Fabiano', 'Cristiano', 'Anderson', 'Rogério', 'Vitor', 'Guilherme',
            'José', 'Julio', 'Sandro', 'Elton', 'Wellington', 'Tiago', 'Renato'
        ];

        const actions = [
            { msg: "Acabou de comprar", product: "Urotestom 3 Meses" },
            { msg: "Adquiriu", product: "Urotestom 3 Meses" },
            { msg: "Garantiu o tratamento de", product: "Urotestom 5 Meses" },
            { msg: "Acabou de comprar o", product: "Urotestom 5 Meses" },
            { msg: "Comprou o Kit de", product: "Urotestom 5 Meses" },
            { msg: "Acabou de comprar", product: "Amostra Grátis Urotestom" },
            { msg: "Garantiu sua", product: "Amostra Grátis Urotestom" },
            { msg: "Pedido realizado:", product: "Amostra Grátis Urotestom" }
        ];

        // Criar container da notificação
        const notification = document.createElement('div');
        notification.id = 'fake-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #111;
            border: 1px solid #333;
            border-left: 4px solid #16a34a;
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(-150%);
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Inter', sans-serif;
            max-width: 90%;
            width: 310px;
        `;

        // Ícone de check de compra verificada
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            background: #16a34a;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        iconContainer.innerHTML = '<i class="fas fa-check" style="color: white; font-size: 1rem;"></i>';

        // Conteúdo de texto com ID para atualizar dinâmica
        const textContent = document.createElement('div');
        textContent.innerHTML = `
            <p style="margin: 0; font-size: 0.9rem; font-weight: bold; color: #fff;" id="notif-name"></p>
            <p style="margin: 2px 0 0; font-size: 0.75rem; color: #aaa;" id="notif-msg"></p>
            <p style="margin: 2px 0 0; font-size: 0.65rem; color: #666;">Há alguns segundos</p>
        `;

        notification.appendChild(iconContainer);
        notification.appendChild(textContent);
        document.body.appendChild(notification);

        let lastIndex = -1;

        const showNotification = () => {
            // Escolher nome aleatório não repetido
            let nameIndex;
            do {
                nameIndex = Math.floor(Math.random() * names.length);
            } while (nameIndex === lastIndex);

            lastIndex = nameIndex;
            const name = names[nameIndex];

            // Escolher ação/produto aleatório
            const action = actions[Math.floor(Math.random() * actions.length)];

            // Atualizar o DOM
            document.getElementById('notif-name').innerText = name;
            document.getElementById('notif-msg').innerHTML = `${action.msg} <strong style="color: #4ade80;">"${action.product}"</strong>`;

            // Mostrar notificação
            if (window.innerWidth < 768) {
                notification.style.left = '50%';
                notification.style.bottom = '10px';
                notification.style.transform = 'translate(-50%, 0)';
            } else {
                notification.style.left = '20px';
                notification.style.bottom = '20px';
                notification.style.transform = 'translateX(0)';
            }

            // Esconder após 4s
            setTimeout(() => {
                if (window.innerWidth < 768) {
                    notification.style.transform = 'translate(-50%, 150%)';
                } else {
                    notification.style.transform = 'translateX(-150%)';
                }
            }, 4000);

            // Agendar próxima (4s + 3s intervalo)
            setTimeout(showNotification, 7000);
        };

        // Começar notificações 2 segundos após a oferta aparecer
        setTimeout(showNotification, 2000);
    }

    // ============================================
    // 4. DATA DINÂMICA
    // ============================================
    const dateElement = document.getElementById('dynamic-date-vsl');
    if (dateElement) {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        dateElement.innerText = new Date().toLocaleDateString('pt-BR', options);
    }

    // ============================================
    // 5. FAQ ACCORDION
    // ============================================
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                faqItems.forEach(other => {
                    if (other !== item) other.classList.remove('active');
                });
                item.classList.toggle('active');
            });
        }
    });

    // ============================================
    // 6. DETECÇÃO DE MOBILE (para ajustes)
    // ============================================
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 768;

    if (isMobile) {
        document.body.classList.add('is-mobile');
        console.log('%c📱 Modo Mobile Detectado', 'color: #f59e0b; font-weight: bold;');
    }

    // ============================================
    // 7. ANIMAÇÃO SUAVE DE FADE-IN
    // ============================================
    // ============================================
    // 7. ANIMAÇÃO SUAVE DE FADE-IN
    // ============================================
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-element {
            animation: fadeIn 0.6s ease-out forwards;
        }
    `;
    document.head.appendChild(style);

});

// ============================================
// LOGICA DO POPUP DE ENDEREÇO (GLOBAL)
// ============================================
let currentCheckoutUrl = '';

window.openAddressModal = function (url) {
    currentCheckoutUrl = url;
    const modal = document.getElementById('address-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Focar no primeiro campo
        setTimeout(() => {
            const cepInput = document.getElementById('cep');
            if (cepInput) cepInput.focus();
        }, 100);
    }
};

window.closeAddressModal = function () {
    const modal = document.getElementById('address-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.submitShippingForm = function (event) {
    event.preventDefault();

    // Validar campos básicos
    const cep = document.getElementById('cep').value;
    const rua = document.getElementById('rua').value;
    const numero = document.getElementById('numero').value;

    if (!cep || !rua || !numero) {
        alert('Por favor, preencha o endereço completo para entrega.');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerText : 'IR PARA PAGAMENTO';

    if (btn) {
        btn.innerText = 'PROCESSANDO...';
        btn.disabled = true;
    }

    // Simular processamento e redirecionar
    setTimeout(() => {
        if (currentCheckoutUrl) {
            // Se possível, passar parametros na URL (opcional/avançado)
            // Por enquanto, redirecionamento simples
            window.location.href = currentCheckoutUrl;
        } else {
            console.error('URL de checkout não definida!');
            alert('Erro ao processar. Tente novamente.');
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    }, 1500);
};

// Auto-complete de CEP
document.addEventListener('DOMContentLoaded', () => {
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', function () {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                document.getElementById('rua').placeholder = 'Buscando...';

                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(response => response.json())
                    .then(data => {
                        if (!data.erro) {
                            document.getElementById('rua').value = data.logradouro;
                            document.getElementById('bairro').value = data.bairro;
                            document.getElementById('cidade').value = data.localidade;
                            document.getElementById('uf').value = data.uf;

                            // Focar no número
                            document.getElementById('numero').focus();
                        } else {
                            alert('CEP não encontrado.');
                            document.getElementById('rua').placeholder = 'Rua...';
                        }
                    })
                    .catch(() => {
                        console.log('Erro ao buscar CEP');
                        document.getElementById('rua').placeholder = 'Rua...';
                    });
            }
        });

        // Máscara simples de CEP
        cepInput.addEventListener('input', function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/);
            e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
        });
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('address-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeAddressModal();
            }
        });
    }
});
