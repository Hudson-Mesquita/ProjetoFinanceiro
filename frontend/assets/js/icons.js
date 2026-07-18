/*
 * FinDash — renderizador local de ícones SVG
 *
 * Substitui a dependência do Font Awesome por desenhos SVG locais.
 * As classes antigas, como "fa-solid fa-wallet", continuam funcionando.
 */
(() => {
    "use strict";

    const ICONS = Object.freeze({
        "fa-wallet": `
            <path d="M4 7.5V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1.5"/>
            <rect x="3" y="7" width="18" height="13" rx="2"/>
            <path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/>
            <circle cx="17" cy="13.5" r=".6" fill="currentColor" stroke="none"/>
        `,

        "fa-chart-pie": `
            <path d="M12 3v9h9A9 9 0 0 0 12 3Z"/>
            <path d="M9.5 4.2A9 9 0 1 0 19.8 14.5H9.5Z"/>
        `,

        "fa-list-ul": `
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
            <path d="M8 6h12M8 12h12M8 18h12"/>
        `,

        "fa-bullseye": `
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>
        `,

        "fa-arrow-trend-down": `
            <path d="M4 6l6 6 4-4 6 6"/>
            <path d="M15 14h5V9"/>
        `,

        "fa-arrow-trend-up": `
            <path d="M4 16l6-6 4 4 6-6"/>
            <path d="M15 8h5v5"/>
        `,

        "fa-chart-line": `
            <path d="M4 19V5M4 19h16"/>
            <path d="M7 15l4-4 3 2 5-6"/>
        `,

        "fa-chevron-left": `
            <path d="M15 5l-7 7 7 7"/>
        `,

        "fa-chevron-right": `
            <path d="M9 5l7 7-7 7"/>
        `,

        "fa-plus": `
            <path d="M12 5v14M5 12h14"/>
        `,

        "fa-xmark": `
            <path d="M6 6l12 12M18 6L6 18"/>
        `,

        "fa-gear": `
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2"/>
            <path d="M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/>
            <circle cx="12" cy="12" r="8"/>
        `,

        "fa-magnifying-glass": `
            <circle cx="10.5" cy="10.5" r="6.5"/>
            <path d="M15.5 15.5L21 21"/>
        `,

        "fa-pen": `
            <path d="M4 20l4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16Z"/>
            <path d="M13.8 7.4l3 3"/>
        `,

        "fa-trash": `
            <path d="M4 7h16M9 3h6l1 4H8Z"/>
            <path d="M7 7l1 14h8l1-14M10 11v6M14 11v6"/>
        `,

        "fa-floppy-disk": `
            <path d="M4 3h13l3 3v15H4Z"/>
            <path d="M8 3v6h8V3M8 21v-7h8v7"/>
        `,

        "fa-piggy-bank": `
            <path d="M5 11a7 7 0 0 1 12-4l3 1v8l-3 1a7 7 0 0 1-12-4Z"/>
            <path d="M5 10H3v4h2M8 17v3M16 17v3M9 7h4"/>
            <circle cx="16" cy="10" r=".7" fill="currentColor" stroke="none"/>
        `,

        "fa-circle-info": `
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 11v6"/>
            <circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none"/>
        `,

        "fa-circle-check": `
            <circle cx="12" cy="12" r="9"/>
            <path d="M8 12l2.7 2.7L16.5 9"/>
        `,

        "fa-circle-exclamation": `
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v6"/>
            <circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none"/>
        `,

        "fa-circle-notch": `
            <path d="M12 3a9 9 0 1 1-8.2 5.3"/>
        `,

        "fa-clock-rotate-left": `
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 7v5l3 2"/>
            <path d="M4 5v4h4"/>
            <path d="M4.5 8A8.5 8.5 0 0 1 12 3.5"/>
        `,

        "fa-coins": `
            <ellipse cx="9" cy="7" rx="5" ry="2.5"/>
            <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5"/>
            <ellipse cx="15" cy="15" rx="5" ry="2.5"/>
            <path d="M10 15v3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3"/>
        `,

        "fa-flag-checkered": `
            <path d="M5 21V4"/>
            <path d="M5 5h13v9H5"/>
            <path d="M5 5l4 4 4-4 5 4M5 14l4-5 4 5 5-5"/>
        `,

        "fa-hourglass-half": `
            <path d="M7 3h10M7 21h10"/>
            <path d="M8 3c0 4 2 5 4 7 2-2 4-3 4-7"/>
            <path d="M8 21c0-4 2-5 4-7 2 2 4 3 4 7"/>
        `,

        "fa-rotate-right": `
            <path d="M20 7v5h-5"/>
            <path d="M19 12a7 7 0 1 1-2-5"/>
        `,

        "fa-triangle-exclamation": `
            <path d="M12 3l10 18H2Z"/>
            <path d="M12 9v5"/>
            <circle cx="12" cy="17.5" r=".8" fill="currentColor" stroke="none"/>
        `,

        "fa-trophy": `
            <path d="M8 4h8v5a4 4 0 0 1-8 0Z"/>
            <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/>
            <path d="M12 13v5M8 21h8M9 18h6"/>
        `,

        "fa-calendar": `
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path d="M7 3v4M17 3v4M3 10h18"/>
        `,
    });

    const SELECTOR =
        "i.fa-solid, i.fa-regular";

    function obterNomeIcone(elemento) {
        return Array.from(
            elemento.classList,
        ).find(
            (classe) =>
                classe.startsWith("fa-") &&
                classe !== "fa-solid" &&
                classe !== "fa-regular" &&
                classe !== "fa-spin",
        );
    }

    function renderizarIcone(elemento) {
        if (
            !(elemento instanceof Element) ||
            elemento.dataset.localIcon === "true"
        ) {
            return;
        }

        const nomeIcone =
            obterNomeIcone(elemento);

        const desenho =
            ICONS[nomeIcone] ??
            `<circle cx="12" cy="12" r="7"/>`;

        elemento.innerHTML = `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false">
                ${desenho}
            </svg>
        `;

        elemento.classList.add(
            "local-icon-host",
        );

        elemento.dataset.localIcon =
            "true";

        elemento.setAttribute(
            "aria-hidden",
            "true",
        );
    }

    function processarArvore(raiz) {
        if (!(raiz instanceof Element || raiz instanceof Document)) {
            return;
        }

        if (
            raiz instanceof Element &&
            raiz.matches(SELECTOR)
        ) {
            renderizarIcone(raiz);
        }

        for (
            const elemento of
            raiz.querySelectorAll(SELECTOR)
        ) {
            renderizarIcone(elemento);
        }
    }

    function iniciar() {
        processarArvore(document);

        const observador =
            new MutationObserver(
                (mutacoes) => {
                    for (const mutacao of mutacoes) {
                        for (
                            const noAdicionado of
                            mutacao.addedNodes
                        ) {
                            processarArvore(
                                noAdicionado,
                            );
                        }
                    }
                },
            );

        observador.observe(
            document.body,
            {
                childList: true,
                subtree: true,
            },
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            {
                once: true,
            },
        );
    } else {
        iniciar();
    }
})();
