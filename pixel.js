/**
 * Meta Pixel - carregado em todas as paginas do funil.
 *
 * Um arquivo so para nao precisar editar 9 HTMLs toda vez que entrar
 * ou sair um pixel. Para adicionar outro, basta por o ID na lista.
 */
(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

var META_PIXELS = [
    '624262646647561',
    '2137138376924895'
];

// Guarda contra carregar o arquivo duas vezes na mesma pagina
if (!window.__metaPixelsIniciados) {
    window.__metaPixelsIniciados = true;

    META_PIXELS.forEach(function (id) {
        fbq('init', id);
    });

    fbq('track', 'PageView');
}
