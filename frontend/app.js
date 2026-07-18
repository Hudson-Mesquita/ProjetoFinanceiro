// URL base da API FastAPI.
// No futuro, o empacotador pode definir window.FINDASH_API_URL antes de carregar este arquivo.
const API_URL = window.FINDASH_API_URL ?? "http://127.0.0.1:8000";

const nomesMeses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
];

const dataHoje = new Date();

const periodoAtual = new Date(
    dataHoje.getFullYear(),
    dataHoje.getMonth(),
    1,
);

let periodoSelecionado = new Date(
    periodoAtual.getFullYear(),
    periodoAtual.getMonth(),
    1,
);

/*
 * Evita que uma resposta antiga da API sobrescreva
 * uma resposta mais recente caso o usuário clique rápido.
 */
let sequenciaCarregamentoDashboard = 0;
let dashboardEstaCarregando = false;

/*
 * Guarda a instância atual do Chart.js.
 *
 * Quando o usuário cria, edita ou exclui uma movimentação,
 * o dashboard é recarregado. Precisamos destruir ou atualizar
 * o gráfico anterior antes de desenhar outro no mesmo canvas.
 */
let graficoFinanceiro = null;
let modoGraficoAtual = "fluxo";
// Guarda o ID da transação atualmente sendo editada.
// null significa que o modal está no modo "Nova movimentação".
let transacaoEmEdicaoId = null;

let contextoGraficoAtual = {
    historico: [],
    ano: null,
    indiceMes: null,
};

function obterElemento(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        throw new Error(`Elemento HTML não encontrado: #${id}`);
    }

    return elemento;
}

function normalizarNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(normalizarNumero(valor));
}
/**
 * Formata valores de forma compacta para o eixo do gráfico.
 *
 * Exemplos:
 * 1000   -> R$ 1 mil
 * 15000  -> R$ 15 mil
 *
 * Nos tooltips continuaremos usando formatarMoeda(), que
 * exibe o valor completo.
 */
function formatarMoedaCompacta(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(normalizarNumero(valor));
}

function formatarData(data) {
    if (!data) {
        return "Data não informada";
    }

    const dataLocal = new Date(`${data}T00:00:00`);

    if (Number.isNaN(dataLocal.getTime())) {
        return String(data);
    }

    return new Intl.DateTimeFormat("pt-BR").format(dataLocal);
}


/**
 * Converte um período em um índice absoluto para comparação.
 *
 * Exemplo: julho de 2026 -> 2026 * 12 + 6.
 */
function obterIndiceAbsolutoPeriodo(data) {
    return (
        data.getFullYear() * 12 +
        data.getMonth()
    );
}

/**
 * Retorna true quando o usuário já está visualizando
 * o mês vigente.
 */
function estaNoMesAtual() {
    return (
        obterIndiceAbsolutoPeriodo(
            periodoSelecionado,
        ) ===
        obterIndiceAbsolutoPeriodo(
            periodoAtual,
        )
    );
}

/**
 * Atualiza:
 * - o título "Julho - 2026";
 * - o estado da seta seguinte;
 * - o estado de carregamento dos botões.
 */
function atualizarControlesNavegacaoMensal() {
    const btnAnterior =
        obterElemento("btn-mes-anterior");

    const btnSeguinte =
        obterElemento("btn-mes-seguinte");

    const titulo =
        obterElemento("titulo-mes");

    const {
        indiceMes,
        ano,
    } = obterPeriodoSelecionado();

    titulo.textContent =
        `${nomesMeses[indiceMes]} - ${ano}`;

    atualizarLinksPaginaTransacoes();

    /*
     * Sempre permitimos consultar meses anteriores.
     */
    btnAnterior.disabled =
        dashboardEstaCarregando;

    /*
     * Não avançamos além do mês atual.
     *
     * Quando o usuário estiver em junho, por exemplo,
     * a seta direita permite voltar para julho.
     * Em julho, ela fica desativada.
     */
    btnSeguinte.disabled =
        dashboardEstaCarregando ||
        estaNoMesAtual();
}

/**
 * Adiciona uma animação curta depois que o novo mês
 * foi renderizado.
 *
 * direcao:
 * -1 = usuário voltou para um mês anterior;
 *  1 = usuário avançou para um mês mais recente.
 */
function animarConteudoDoPeriodo(direcao) {
    const container =
        document.getElementById(
            "conteudo-periodo",
        );

    if (!container || direcao === 0) {
        return;
    }

    const classeAnimacao =
        direcao < 0
            ? "period-enter-from-left"
            : "period-enter-from-right";

    container.classList.remove(
        "period-enter-from-left",
        "period-enter-from-right",
    );

    /*
     * Força o navegador a reconhecer uma nova animação
     * mesmo quando o usuário navega várias vezes seguidas.
     */
    void container.offsetWidth;

    container.classList.add(
        classeAnimacao,
    );

    container.addEventListener(
        "animationend",
        () => {
            container.classList.remove(
                classeAnimacao,
            );
        },
        {
            once: true,
        },
    );
}
/**
 * Marca visualmente que o conteúdo do período
 * está sendo atualizado.
 */
function definirCarregamentoDoPeriodo(
    estaCarregando,
) {
    dashboardEstaCarregando =
        estaCarregando;

    const container =
        document.getElementById(
            "conteudo-periodo",
        );

    if (container) {
        container.classList.toggle(
            "period-loading",
            estaCarregando,
        );
    }

    atualizarControlesNavegacaoMensal();
}


/**
 * Devolve o mês e o ano atualmente selecionados
 * nos formatos usados pela API e pelo Chart.js.
 */
function obterPeriodoSelecionado() {
    const indiceMes =
        periodoSelecionado.getMonth();

    const ano =
        periodoSelecionado.getFullYear();

    const mesFormatado =
        String(indiceMes + 1).padStart(
            2,
            "0",
        );

    return {
        indiceMes,
        ano,
        mesFormatado,
    };
}


/* =========================================================
   LINKS PARA A PÁGINA DE TRANSAÇÕES
   ========================================================= */

const PAGINA_TRANSACOES = "transacoes.html";


/**
 * Monta a URL do histórico usando o mês atualmente
 * selecionado no dashboard e o tipo solicitado.
 */
function construirUrlPaginaTransacoes(tipo = "todos") {
    const {
        mesFormatado,
        ano,
    } = obterPeriodoSelecionado();

    const parametros = new URLSearchParams({
        tipo,
        mes: mesFormatado,
        ano: String(ano),
    });

    return (
        `${PAGINA_TRANSACOES}?` +
        parametros.toString()
    );
}


/**
 * Mantém os links dos popovers e o "Ver tudo"
 * sincronizados com o mês exibido no dashboard.
 */
function atualizarLinksPaginaTransacoes() {
    const linkDespesas =
        document.getElementById(
            "link-historico-despesas",
        );

    const linkReceitas =
        document.getElementById(
            "link-historico-receitas",
        );

    const linkTodas =
        document.getElementById(
            "link-todas-transacoes",
        );

    if (linkDespesas) {
        linkDespesas.href =
            construirUrlPaginaTransacoes(
                "despesa",
            );
    }

    if (linkReceitas) {
        linkReceitas.href =
            construirUrlPaginaTransacoes(
                "receita",
            );
    }

    if (linkTodas) {
        linkTodas.href =
            construirUrlPaginaTransacoes(
                "todos",
            );
    }
}


/**
 * Retorna a data local no formato YYYY-MM-DD.
 *
 * O input type="date" exige exatamente esse formato.
 * Não usamos diretamente toISOString() porque ele trabalha
 * com UTC e pode avançar a data no horário brasileiro.
 */
function obterDataLocalISO() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function ordenarPorMaisRecentes(transacoes) {
    return [...transacoes].sort((a, b) => {
        const dataA = new Date(`${a.data}T00:00:00`).getTime() || 0;
        const dataB = new Date(`${b.data}T00:00:00`).getTime() || 0;

        if (dataA !== dataB) {
            return dataB - dataA;
        }

        return normalizarNumero(b.id) - normalizarNumero(a.id);
    });
}

/**
 * Move o período selecionado.
 *
 * deslocamento:
 * -1 = mês anterior;
 *  1 = mês seguinte.
 */
async function navegarEntreMeses(
    deslocamento,
) {
    if (dashboardEstaCarregando) {
        return;
    }

    const novoPeriodo = new Date(
        periodoSelecionado.getFullYear(),
        periodoSelecionado.getMonth() +
            deslocamento,
        1,
    );

    /*
     * Proteção extra: meses futuros não são abertos.
     */
    if (
        obterIndiceAbsolutoPeriodo(
            novoPeriodo,
        ) >
        obterIndiceAbsolutoPeriodo(
            periodoAtual,
        )
    ) {
        return;
    }

    periodoSelecionado = novoPeriodo;

    atualizarControlesNavegacaoMensal();

    await carregarDashboard(
        deslocamento,
    );
}

function configurarNavegacaoMensal() {
    const btnAnterior =
        obterElemento("btn-mes-anterior");

    const btnSeguinte =
        obterElemento("btn-mes-seguinte");

    btnAnterior.addEventListener(
        "click",
        () => {
            navegarEntreMeses(-1);
        },
    );

    btnSeguinte.addEventListener(
        "click",
        () => {
            navegarEntreMeses(1);
        },
    );

    atualizarControlesNavegacaoMensal();
}
/**
 * Sugere uma data dentro do mês visualizado
 * ao criar uma nova movimentação.
 *
 * - No mês atual: usa a data de hoje.
 * - Em um mês anterior: mantém o mesmo número do dia,
 *   limitado ao último dia daquele mês.
 *
 * Exemplo:
 * hoje = 31/07
 * mês visualizado = junho
 * resultado = 30/06
 */
function obterDataInicialDoPeriodoSelecionado() {
    if (estaNoMesAtual()) {
        return obterDataLocalISO();
    }

    const ano =
        periodoSelecionado.getFullYear();

    const indiceMes =
        periodoSelecionado.getMonth();

    const ultimoDiaDoMes =
        new Date(
            ano,
            indiceMes + 1,
            0,
        ).getDate();

    const dia =
        Math.min(
            dataHoje.getDate(),
            ultimoDiaDoMes,
        );

    const mesFormatado =
        String(indiceMes + 1).padStart(
            2,
            "0",
        );

    const diaFormatado =
        String(dia).padStart(
            2,
            "0",
        );

    return (
        `${ano}-${mesFormatado}-${diaFormatado}`
    );
}


async function buscarJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);

    let dados = null;

    try {
        dados = await resposta.json();
    } catch {
        // Algumas respostas de erro podem não conter JSON.
    }

    if (!resposta.ok) {
        const detalhe =
            dados?.detail ??
            dados?.error ??
            dados?.erro ??
            `Erro HTTP ${resposta.status}`;

        throw new Error(String(detalhe));
    }

    return dados ?? {};
}
function destruirGraficoAtual() {
    if (graficoFinanceiro) {
        graficoFinanceiro.destroy();
        graficoFinanceiro = null;
    }
}
function mostrarGraficoVazio(mensagem) {
    const canvas = obterElemento("grafico-financeiro");
    const estadoVazio = obterElemento("grafico-vazio");
    const resumo = obterElemento("resumo-grafico");

    destruirGraficoAtual();

    canvas.hidden = true;
    resumo.classList.add("oculto");

    const paragrafo = estadoVazio.querySelector("p");

    if (paragrafo) {
        paragrafo.textContent = mensagem;
    }

    estadoVazio.classList.remove("oculto");
}

function prepararCanvasGrafico() {
    const canvas = obterElemento("grafico-financeiro");
    const estadoVazio = obterElemento("grafico-vazio");

    destruirGraficoAtual();

    canvas.hidden = false;
    estadoVazio.classList.add("oculto");

    return canvas.getContext("2d");
}


function obterVisualTransacao(transacao) {
    const tipo = String(transacao.tipo ?? "").toLowerCase();
    const ehReceita = tipo === "receita" || tipo === "recebimento";
    const ehMeta = normalizarNumero(transacao.meta_id) > 0;

    if (ehMeta) {
        return {
            classeIcone: "meta",
            icone: "fa-piggy-bank",
            classeValor: "neutro",
            sinal: ehReceita ? "+" : "-",
        };
    }

    return {
        classeIcone: ehReceita ? "receita" : "despesa",
        icone: ehReceita ? "fa-arrow-trend-up" : "fa-arrow-trend-down",
        classeValor: ehReceita ? "positivo" : "negativo",
        sinal: ehReceita ? "+" : "-",
    };
}

function criarEstadoVazio(mensagem) {
    const container = document.createElement("div");
    container.className = "empty-state";

    const texto = document.createElement("p");
    texto.textContent = mensagem;

    container.appendChild(texto);
    return container;
}

/**
 * Cria visualmente uma linha de movimentação.
 *
 * A função recebe o objeto vindo da API e constrói:
 * - ícone;
 * - descrição;
 * - categoria e data;
 * - valor;
 * - botão de editar;
 * - botão de excluir.
 */
function criarElementoTransacao(transacao) {
    const visual = obterVisualTransacao(transacao);

    // Container principal da movimentação.
    const item = document.createElement("div");
    item.className = "transaction-item";

    // ---------------------------------------------------------
    // LADO ESQUERDO: ícone, descrição, categoria e data
    // ---------------------------------------------------------

    const ladoEsquerdo = document.createElement("div");
    ladoEsquerdo.className = "transaction-left";

    const caixaIcone = document.createElement("div");
    caixaIcone.className = `transaction-icon ${visual.classeIcone}`;

    const icone = document.createElement("i");
    icone.className = `fa-solid ${visual.icone}`;

    caixaIcone.appendChild(icone);

    const detalhes = document.createElement("div");
    detalhes.className = "transaction-details";

    const descricao = document.createElement("h4");
    descricao.textContent = transacao.descricao || "Sem descrição";

    const informacoes = document.createElement("p");
    const categoria = transacao.categoria || "Sem categoria";

    informacoes.textContent =
        `${categoria} • ${formatarData(transacao.data)}`;

    detalhes.append(descricao, informacoes);
    ladoEsquerdo.append(caixaIcone, detalhes);

    // ---------------------------------------------------------
    // LADO DIREITO: valor e botões de ação
    // ---------------------------------------------------------

    const ladoDireito = document.createElement("div");
    ladoDireito.className = "transaction-right";

    const valor = document.createElement("div");
    valor.className =
        `transaction-value ${visual.classeValor}`;

    valor.textContent =
        `${visual.sinal} ${formatarMoeda(transacao.valor)}`;

    const acoes = document.createElement("div");
    acoes.className = "transaction-actions";

    // Botão de edição.
    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn-icon edit";
    btnEditar.title = "Editar movimentação";
    btnEditar.setAttribute(
        "aria-label",
        `Editar ${transacao.descricao}`,
    );

    const iconeEditar = document.createElement("i");
    iconeEditar.className = "fa-solid fa-pen";

    btnEditar.appendChild(iconeEditar);

    btnEditar.addEventListener("click", () => {
        abrirModalTransacao(transacao);
    });

    // Botão de exclusão.
    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn-icon delete";
    btnExcluir.title = "Excluir movimentação";
    btnExcluir.setAttribute(
        "aria-label",
        `Excluir ${transacao.descricao}`,
    );

    const iconeExcluir = document.createElement("i");
    iconeExcluir.className = "fa-solid fa-trash";

    btnExcluir.appendChild(iconeExcluir);

    btnExcluir.addEventListener("click", () => {
        deletarTransacao(transacao);
    });

    acoes.append(btnEditar, btnExcluir);
    ladoDireito.append(valor, acoes);

    item.append(ladoEsquerdo, ladoDireito);

    return item;
}

function renderizarTransacoes(historico) {
    const lista = obterElemento("lista-transacoes");
    lista.replaceChildren();

    const ordenadas = ordenarPorMaisRecentes(historico);
    const ultimas = ordenadas.slice(0, 5);

    if (ultimas.length === 0) {
        lista.appendChild(
            criarEstadoVazio("Nenhuma movimentação registrada neste mês."),
        );
        return;
    }

    const fragmento = document.createDocumentFragment();

    for (const transacao of ultimas) {
        fragmento.appendChild(criarElementoTransacao(transacao));
    }

    lista.appendChild(fragmento);
}

function criarItemMiniLista(transacao) {
    const item = document.createElement("li");

    const descricao = document.createElement("span");
    descricao.textContent = transacao.descricao || "Sem descrição";
    descricao.style.whiteSpace = "nowrap";
    descricao.style.overflow = "hidden";
    descricao.style.textOverflow = "ellipsis";
    descricao.style.maxWidth = "120px";

    const valor = document.createElement("span");
    valor.textContent = formatarMoeda(transacao.valor);
    valor.style.fontWeight = "600";

    item.append(descricao, valor);
    return item;
}

function renderizarMiniLista(listaId, transacoes, tipoFiltrado) {
    const lista = obterElemento(listaId);
    lista.replaceChildren();

    const filtradas = ordenarPorMaisRecentes(
        transacoes.filter((transacao) => {
            const tipo = String(transacao.tipo ?? "").toLowerCase();

            if (tipoFiltrado === "receita") {
                return tipo === "receita" || tipo === "recebimento";
            }

            return tipo === "despesa";
        }),
    ).slice(0, 3);

    if (filtradas.length === 0) {
        const item = document.createElement("li");
        const texto = document.createElement("span");

        texto.textContent = "Nenhuma registrada";
        texto.style.color = "var(--texto-secundario)";

        item.appendChild(texto);
        lista.appendChild(item);
        return;
    }

    const fragmento = document.createDocumentFragment();

    for (const transacao of filtradas) {
        fragmento.appendChild(criarItemMiniLista(transacao));
    }

    lista.appendChild(fragmento);
}

function atualizarResumo(dados) {
    const receitas = normalizarNumero(dados.receitas);
    const despesas = normalizarNumero(dados.despesas);
    const saldo = normalizarNumero(dados.saldo);

    const elementoSaldo = obterElemento("valor-saldo");
    elementoSaldo.textContent = formatarMoeda(saldo);
    elementoSaldo.style.color =
        saldo < 0 ? "var(--cor-despesa)" : "var(--texto-principal)";

    obterElemento("valor-receitas").textContent = formatarMoeda(receitas);
    obterElemento("valor-despesas").textContent = formatarMoeda(despesas);
}

function configurarPopovers() {
    const btnDespesas = obterElemento("btn-despesas");
    const btnReceitas = obterElemento("btn-receitas");
    const popoverDespesas = obterElemento("popover-despesas");
    const popoverReceitas = obterElemento("popover-receitas");

    btnDespesas.addEventListener("click", (evento) => {
        evento.stopPropagation();
        popoverDespesas.classList.toggle("oculto");
        popoverReceitas.classList.add("oculto");
    });

    btnReceitas.addEventListener("click", (evento) => {
        evento.stopPropagation();
        popoverReceitas.classList.toggle("oculto");
        popoverDespesas.classList.add("oculto");
    });

    popoverDespesas.addEventListener("click", (evento) => {
        evento.stopPropagation();
    });

    popoverReceitas.addEventListener("click", (evento) => {
        evento.stopPropagation();
    });

    document.addEventListener("click", () => {
        popoverDespesas.classList.add("oculto");
        popoverReceitas.classList.add("oculto");
    });
}

/**
 * Abre o modal no modo de criação ou edição.
 *
 * Quando "transacao" for null:
 * - limpa o formulário;
 * - preenche a data atual;
 * - usa POST posteriormente.
 *
 * Quando receber uma transação:
 * - preenche todos os campos;
 * - guarda o ID;
 * - usa PUT posteriormente.
 */
async function abrirModalTransacao(transacao = null) {
    const modal = obterElemento("modal-transacao");
    const form = obterElemento("form-transacao");
    const btnSalvar = obterElemento("btn-salvar-transacao");

    const tituloModal =
        modal.querySelector(".modal-header h2");

    // Sempre limpa resíduos de uma abertura anterior.
    form.reset();

    // ---------------------------------------------------------
    // MODO EDIÇÃO
    // ---------------------------------------------------------

    if (transacao) {
        transacaoEmEdicaoId = transacao.id;

        if (tituloModal) {
            tituloModal.textContent = "Editar Movimentação";
        }

        btnSalvar.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Atualizar';

        // Carrega as categorias e seleciona a categoria
        // atualmente vinculada à transação.
        await carregarCategoriasParaModal(
            transacao.categoria_id,
        );

        form.elements["descricao"].value =
            transacao.descricao ?? "";

        form.elements["valor"].value =
            transacao.valor ?? "";

        form.elements["tipo"].value =
            transacao.tipo ?? "despesa";

        form.elements["data"].value =
            transacao.data ?? obterDataLocalISO();

        form.elements["categoria_id"].value =
            transacao.categoria_id ?? "";

        form.elements["meta_id"].value =
            transacao.meta_id ?? "";
    }

    // ---------------------------------------------------------
    // MODO CRIAÇÃO
    // ---------------------------------------------------------

    else {
        transacaoEmEdicaoId = null;

        if (tituloModal) {
            tituloModal.textContent = "Registrar Movimentação";
        }

        btnSalvar.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Salvar';

        await carregarCategoriasParaModal();

        form.elements["data"].value =
            obterDataInicialDoPeriodoSelecionado();
    }

    modal.classList.remove("oculto");

    // Coloca o cursor diretamente na descrição.
    form.elements["descricao"].focus();
}


/**
 * Fecha o modal e limpa o estado de edição.
 */
function fecharModalTransacao() {
    const modal = obterElemento("modal-transacao");

    modal.classList.add("oculto");
    transacaoEmEdicaoId = null;
}


/**
 * Configura todos os eventos do modal:
 * - abrir;
 * - fechar;
 * - cancelar;
 * - clicar fora;
 * - enviar POST ou PUT.
 */
function configurarModalTransacao() {
    const modal = obterElemento("modal-transacao");
    const form = obterElemento("form-transacao");

    const btnNova =
        obterElemento("btn-nova-transacao");

    const btnFechar =
        obterElemento("btn-fechar-modal");

    const btnCancelar =
        obterElemento("btn-cancelar-modal");

    const btnSalvar =
        obterElemento("btn-salvar-transacao");

    // ---------------------------------------------------------
    // ABERTURA E FECHAMENTO
    // ---------------------------------------------------------

    btnNova.addEventListener("click", () => {
        abrirModalTransacao();
    });

    btnFechar.addEventListener(
        "click",
        fecharModalTransacao,
    );

    btnCancelar.addEventListener(
        "click",
        fecharModalTransacao,
    );

    // Fecha apenas quando o usuário clica no fundo escuro,
    // não quando clica dentro da caixa do formulário.
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) {
            fecharModalTransacao();
        }
    });

    // ---------------------------------------------------------
    // ENVIO DO FORMULÁRIO
    // ---------------------------------------------------------

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const textoOriginal = btnSalvar.innerHTML;

        btnSalvar.disabled = true;
        btnSalvar.innerHTML =
            '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';

        try {
            const formData = new FormData(form);

            const categoriaBruta =
                formData.get("categoria_id");

            const metaBruta =
                formData.get("meta_id");

            const categoriaId =
                categoriaBruta
                    ? Number.parseInt(categoriaBruta, 10)
                    : null;

            const metaId =
                metaBruta
                    ? Number.parseInt(metaBruta, 10)
                    : null;

            // Validação simples antes de chamar o backend.
            if (!categoriaId) {
                throw new Error(
                    "Selecione uma categoria.",
                );
            }

            const payload = {
                descricao:
                    String(
                        formData.get("descricao") ?? "",
                    ).trim(),

                valor:
                    normalizarNumero(
                        formData.get("valor"),
                    ),

                tipo:
                    formData.get("tipo"),

                data:
                    formData.get("data"),

                categoria_id:
                    categoriaId,

                meta_id:
                    metaId,
            };

            // Se existe um ID, estamos editando.
            const estaEditando =
                transacaoEmEdicaoId !== null;

            const endpoint =
                estaEditando
                    ? `${API_URL}/transacoes/${transacaoEmEdicaoId}`
                    : `${API_URL}/transacoes`;

            const metodo =
                estaEditando ? "PUT" : "POST";

            await buscarJson(endpoint, {
                method: metodo,

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(payload),
            });

            fecharModalTransacao();

            // Atualiza saldo, receitas, despesas,
            // movimentações e popovers.
            await carregarDashboard();
        } catch (erro) {
            console.error(
                "Falha ao salvar movimentação:",
                erro,
            );

            alert(
                `Erro ao salvar:\n${erro.message}`,
            );
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = textoOriginal;
        }
    });
}


/**
 * Exclui uma movimentação depois da confirmação.
 */
async function deletarTransacao(transacao) {
    const confirmou = window.confirm(
        `Deseja realmente excluir a movimentação ` +
        `"${transacao.descricao}"?`,
    );

    if (!confirmou) {
        return;
    }

    try {
        await buscarJson(
            `${API_URL}/transacoes/${transacao.id}`,
            {
                method: "DELETE",
            },
        );

        // Após excluir, recalculamos todo o dashboard.
        await carregarDashboard();
    } catch (erro) {
        console.error(
            "Falha ao excluir movimentação:",
            erro,
        );

        alert(
            `Não foi possível excluir:\n${erro.message}`,
        );
    }
}

// --- NOVA LÓGICA DO GERENCIADOR DE CATEGORIAS ---

function configurarGerenciadorCategorias() {
    const btnAbrir = obterElemento("btn-abrir-gerenciador-categorias");
    const modalCategorias = obterElemento("modal-categorias");
    const btnFechar = obterElemento("btn-fechar-categorias");
    const formNova = obterElemento("form-nova-categoria");
    const inputNova = obterElemento("input-nova-categoria");
    const listaGerenciador = obterElemento("lista-gerenciador-categorias");

    // Abrir o Modal de Categorias (e buscar a lista atualizada)
    const abrirGerenciador = async (evento) => {
        evento.preventDefault();
        modalCategorias.classList.remove("oculto");
        await atualizarListaGerenciador();
    };

    // Fechar o Modal de Categorias (e atualizar o select do modal principal)
    const fecharGerenciador = () => {
        modalCategorias.classList.add("oculto");
        carregarCategoriasParaModal(); // Recarrega o <select> com as novidades
    };

    btnAbrir.addEventListener("click", abrirGerenciador);
    btnFechar.addEventListener("click", fecharGerenciador);
    
    // Fecha clicando no fundo, mas não se clicar dentro da caixa branca
    modalCategorias.addEventListener("click", (evento) => {
        if (evento.target === modalCategorias) fecharGerenciador();
    });

    // Função interna que recarrega a lista do Modal de Categorias
    async function atualizarListaGerenciador() {
        listaGerenciador.replaceChildren();
        listaGerenciador.innerHTML = '<li style="text-align: center; color: var(--texto-secundario);">Carregando...</li>';
        
        try {
            const dados = await buscarJson(`${API_URL}/categorias`);
            const listaCategorias = Array.isArray(dados.categorias) ? dados.categorias : dados;
            
            listaGerenciador.replaceChildren();

            if (listaCategorias.length === 0) {
                listaGerenciador.innerHTML = '<li style="text-align: center; color: var(--texto-secundario);">Nenhuma categoria</li>';
                return;
            }

            const fragmento = document.createDocumentFragment();
            
            for (const cat of listaCategorias) {
                const li = document.createElement("li");
                li.className = "category-list-item";
                
                const spanNome = document.createElement("span");
                spanNome.textContent = cat.nome;
                
                const divAcoes = document.createElement("div");
                divAcoes.className = "category-actions";
                
                // Botão de Deletar
                // Botão de Deletar com Raio-X
                const btnDeletar = document.createElement("button");
                btnDeletar.type = "button"; // Bloqueia o Fantasma 3 (recarregamento de tela)
                btnDeletar.className = "btn-icon delete";
                btnDeletar.innerHTML = '<i class="fa-solid fa-trash"></i>';
                
                // Adicionando a ação com Console Log para Debug
                btnDeletar.onclick = () => {
                    console.log("🔍 Inspecionando a Categoria clicada:", cat); // Aperte F12 no navegador e olhe a aba "Console"
                    
                    if (cat.id === undefined) {
                        alert("Opa! O 'id' está undefined. Abra o F12 e veja qual é o nome correto da chave que o Python está enviando.");
                        return;
                    }
                    
                    deletarCategoria(cat.id, cat.nome);
                };
                divAcoes.appendChild(btnDeletar);
                li.append(spanNome, divAcoes);
                fragmento.appendChild(li);
            }
            
            listaGerenciador.appendChild(fragmento);
            
        } catch (erro) {
            listaGerenciador.innerHTML = `<li style="color: var(--cor-despesa);">Erro ao carregar categorias</li>`;
        }
    }

    // Ação: CRIAR NOVA CATEGORIA
    formNova.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        
        const nomeCategoria = inputNova.value.trim();
        if (!nomeCategoria) return;

        try {
            inputNova.disabled = true;
            
            // Enviando o POST para sua rota de criar categoria
            await buscarJson(`${API_URL}/categorias`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // O schema do Pydantic deve esperar um campo "nome"
                body: JSON.stringify({ nome: nomeCategoria }) 
            });

            inputNova.value = ""; // Limpa a caixa de texto
            await atualizarListaGerenciador(); // Recarrega a lista para mostrar a nova
            
        } catch (erro) {
            alert(`Erro ao criar: ${erro.message}`);
        } finally {
            inputNova.disabled = false;
            inputNova.focus(); // Devolve o cursor para digitar a próxima
        }
    });

    // Ação: DELETAR CATEGORIA
    async function deletarCategoria(id, nome) {
        // Confirmação dupla para evitar cliques acidentais
        if (!confirm(`Tem certeza que deseja apagar a categoria "${nome}"?`)) {
            return;
        }

        try {
            await buscarJson(`${API_URL}/categorias/${id}`, { 
                method: "DELETE" 
            });
            
            await atualizarListaGerenciador(); // Recarrega a lista sem a categoria apagada
            
        } catch (erro) {
            // Se o backend bloqueou por causa de transações, o erro aparecerá aqui!
            alert(`Não foi possível deletar:\n${erro.message}`);
        }
    }
}

function mostrarErroNoDashboard(erro) {
    console.error("Erro ao carregar o dashboard:", erro);

    obterElemento("valor-saldo").textContent = "Indisponível";
    obterElemento("valor-receitas").textContent = "—";
    obterElemento("valor-despesas").textContent = "—";

    const lista = obterElemento("lista-transacoes");
    lista.replaceChildren(
        criarEstadoVazio(
            "Não foi possível carregar os dados. Verifique se a API está em execução.",
        ),
    );
}

/**
 * Busca as categorias no backend e preenche o select.
 *
 * categoriaSelecionadaId:
 * - null: modo de criação, nenhuma selecionada;
 * - número: modo edição, seleciona a categoria correspondente.
 */
async function carregarCategoriasParaModal(
    categoriaSelecionadaId = null,
) {
    const select =
        obterElemento("select-categoria");

    try {
        const dados =
            await buscarJson(`${API_URL}/categorias`);

        const listaCategorias =
            Array.isArray(dados.categorias)
                ? dados.categorias
                : dados;

        select.replaceChildren();

        // Primeira opção apenas como instrução.
        const placeholder =
            document.createElement("option");

        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.textContent =
            "Selecione uma categoria...";

        // Só fica selecionado no modo de criação.
        placeholder.selected =
            categoriaSelecionadaId === null ||
            categoriaSelecionadaId === undefined;

        select.appendChild(placeholder);

        if (listaCategorias.length === 0) {
            placeholder.textContent =
                "Nenhuma categoria cadastrada";

            return;
        }

        const fragmento =
            document.createDocumentFragment();

        for (const categoria of listaCategorias) {
            const opcao =
                document.createElement("option");

            opcao.value = categoria.id;
            opcao.textContent = categoria.nome;

            // Number() evita diferença entre ID numérico
            // e valor recebido como string.
            opcao.selected =
                Number(categoria.id) ===
                Number(categoriaSelecionadaId);

            fragmento.appendChild(opcao);
        }

        select.appendChild(fragmento);
    } catch (erro) {
        console.error(
            "Erro ao carregar categorias:",
            erro,
        );

        select.replaceChildren();

        const opcaoErro =
            document.createElement("option");

        opcaoErro.value = "";
        opcaoErro.disabled = true;
        opcaoErro.selected = true;
        opcaoErro.textContent =
            "Erro ao carregar categorias";

        select.appendChild(opcaoErro);
    }
}

/* =========================================================
   GRÁFICO FINANCEIRO
   ========================================================= */

/**
 * Agrupa as movimentações por dia.
 *
 * A API devolve uma lista semelhante a:
 *
 * {
 *     data: "2026-07-17",
 *     tipo: "despesa",
 *     valor: 120
 * }
 *
 * Para desenhar o gráfico, transformamos essa lista em:
 *
 * labels:   ["01", "02", "03", ...]
 * receitas: [0, 500, 0, ...]
 * despesas: [80, 0, 120, ...]
 */
function prepararDadosGraficoFluxo(historico, ano, indiceMes) {
    const quantidadeDias =
        new Date(ano, indiceMes + 1, 0).getDate();

    const labels = [];
    const receitasPorDia =
        new Array(quantidadeDias).fill(0);

    const despesasPorDia =
        new Array(quantidadeDias).fill(0);

    for (let dia = 1; dia <= quantidadeDias; dia += 1) {
        labels.push(String(dia).padStart(2, "0"));
    }

    for (const transacao of historico) {
        if (!transacao.data) {
            continue;
        }

        const partesData =
            String(transacao.data).split("-");

        if (partesData.length !== 3) {
            continue;
        }

        const anoTransacao =
            Number.parseInt(partesData[0], 10);

        const mesTransacao =
            Number.parseInt(partesData[1], 10);

        const diaTransacao =
            Number.parseInt(partesData[2], 10);

        if (
            anoTransacao !== ano ||
            mesTransacao !== indiceMes + 1 ||
            diaTransacao < 1 ||
            diaTransacao > quantidadeDias
        ) {
            continue;
        }

        const indiceDia = diaTransacao - 1;
        const valor = normalizarNumero(transacao.valor);
        const tipo =
            String(transacao.tipo ?? "").toLowerCase();

        if (
            tipo === "receita" ||
            tipo === "recebimento"
        ) {
            receitasPorDia[indiceDia] += valor;
        } else if (tipo === "despesa") {
            despesasPorDia[indiceDia] += valor;
        }
    }

    const resultadoAcumulado = [];
    let acumulado = 0;

    for (
        let indice = 0;
        indice < quantidadeDias;
        indice += 1
    ) {
        acumulado +=
            receitasPorDia[indice] -
            despesasPorDia[indice];

        resultadoAcumulado.push(acumulado);
    }

    return {
        labels,
        receitasPorDia,
        despesasPorDia,
        resultadoAcumulado,
    };
}
function renderizarGraficoFluxo(
    historico,
    ano,
    indiceMes,
) {
    const titulo = obterElemento("titulo-grafico");
    const descricao = obterElemento("descricao-grafico");
    const resumo = obterElemento("resumo-grafico");

    titulo.textContent = "Fluxo financeiro do mês";
    descricao.textContent =
        "Receitas, despesas e resultado acumulado por dia";

    resumo.classList.add("oculto");

    if (typeof Chart === "undefined") {
        mostrarGraficoVazio(
            "A biblioteca do gráfico não foi carregada.",
        );
        return;
    }

    if (!Array.isArray(historico) || historico.length === 0) {
        mostrarGraficoVazio(
            "Ainda não existem movimentações neste mês.",
        );
        return;
    }

    const dados =
        prepararDadosGraficoFluxo(
            historico,
            ano,
            indiceMes,
        );

    const contexto = prepararCanvasGrafico();

    graficoFinanceiro = new Chart(contexto, {
        type: "bar",

        data: {
            labels: dados.labels,

            datasets: [
                {
                    label: "Receitas",
                    data: dados.receitasPorDia,
                    backgroundColor:
                        "rgba(16, 185, 129, 0.45)",
                    borderColor:
                        "rgba(16, 185, 129, 1)",
                    borderWidth: 1,
                    borderRadius: 5,
                    order: 2,
                },
                {
                    label: "Despesas",
                    data: dados.despesasPorDia,
                    backgroundColor:
                        "rgba(239, 68, 68, 0.45)",
                    borderColor:
                        "rgba(239, 68, 68, 1)",
                    borderWidth: 1,
                    borderRadius: 5,
                    order: 2,
                },
                {
                    type: "line",
                    label: "Resultado acumulado",
                    data: dados.resultadoAcumulado,
                    borderColor:
                        "rgba(99, 102, 241, 1)",
                    backgroundColor:
                        "rgba(99, 102, 241, 0.15)",
                    borderWidth: 3,

                    /*
                     * Evita que a curva crie picos ou vales
                     * inexistentes entre os pontos.
                     */
                    cubicInterpolationMode: "monotone",
                    tension: 0,

                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointHitRadius: 12,
                    fill: false,
                    order: 1,
                },
            ],
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false,
            },

            plugins: {
                legend: {
                    position: "top",

                    labels: {
                        color: "#f3f4f6",
                        usePointStyle: true,
                        padding: 20,
                    },
                },

                tooltip: {
                    backgroundColor: "#17171a",
                    borderColor: "#374151",
                    borderWidth: 1,
                    titleColor: "#f3f4f6",
                    bodyColor: "#f3f4f6",
                    padding: 12,

                    callbacks: {
                        label(contextoTooltip) {
                            const nome =
                                contextoTooltip.dataset.label;

                            const valor =
                                contextoTooltip.parsed.y;

                            return (
                                `${nome}: ` +
                                formatarMoeda(valor)
                            );
                        },

                        title(itensTooltip) {
                            const dia =
                                itensTooltip[0]?.label ?? "";

                            return `Dia ${dia}`;
                        },
                    },
                },
            },

            scales: {
                x: {
                    ticks: {
                        color: "#9ca3af",
                        maxTicksLimit: 16,
                    },

                    grid: {
                        display: false,
                    },

                    title: {
                        display: true,
                        text: "Dia do mês",
                        color: "#9ca3af",
                    },
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: "#9ca3af",

                        callback(valor) {
                            return formatarMoedaCompacta(
                                valor,
                            );
                        },
                    },

                    grid: {
                        color:
                            "rgba(55, 65, 81, 0.45)",
                    },

                    title: {
                        display: true,
                        text: "Valor",
                        color: "#9ca3af",
                    },
                },
            },
        },
    });
}


/* =========================================================
   GRÁFICO 2: ALOCAÇÃO DA RENDA
   ========================================================= */

/**
 * Retorna um rótulo para cada saída.
 *
 * Regras:
 * - transação vinculada a uma meta: "Meta: descrição";
 * - despesa comum: nome da categoria;
 * - sem categoria: "Sem categoria".
 */
function obterRotuloAlocacao(transacao) {
    const possuiMeta =
        normalizarNumero(transacao.meta_id) > 0;

    if (possuiMeta) {
        const nomeMeta =
            String(
                transacao.descricao ??
                "Reserva",
            ).trim();

        return `Meta: ${nomeMeta || "Reserva"}`;
    }

    return (
        String(
            transacao.categoria ??
            "Sem categoria",
        ).trim() ||
        "Sem categoria"
    );
}

function prepararDadosGraficoAlocacao(historico) {
    let totalReceitas = 0;
    let totalAlocado = 0;

    const valoresPorCategoria = new Map();

    for (const transacao of historico) {
        const tipo =
            String(transacao.tipo ?? "").toLowerCase();

        const valor =
            Math.abs(
                normalizarNumero(transacao.valor),
            );

        /*
         * Toda transação marcada como receita ou recebimento
         * aumenta o tamanho total da renda do mês.
         *
         * A categoria "Salário", "Freelancer" etc. não vira
         * uma fatia, pois representa origem do dinheiro.
         */
        if (
            tipo === "receita" ||
            tipo === "recebimento"
        ) {
            totalReceitas += valor;
            continue;
        }

        /*
         * Apenas aquilo marcado como despesa é considerado
         * destino/alocação da renda.
         *
         * Uma meta entra aqui quando o aporte foi cadastrado
         * como despesa e possui meta_id.
         */
        if (tipo !== "despesa") {
            continue;
        }

        const rotulo =
            obterRotuloAlocacao(transacao);

        const valorAtual =
            valoresPorCategoria.get(rotulo) ?? 0;

        valoresPorCategoria.set(
            rotulo,
            valorAtual + valor,
        );

        totalAlocado += valor;
    }

    /*
     * Ordena as categorias da maior para a menor.
     */
    const categoriasOrdenadas =
        [...valoresPorCategoria.entries()]
            .sort((a, b) => b[1] - a[1]);

    const labels =
        categoriasOrdenadas.map(
            ([rotulo]) => rotulo,
        );

    const valores =
        categoriasOrdenadas.map(
            ([, valor]) => valor,
        );

    /*
     * Quando a renda é maior do que as saídas,
     * a diferença vira a fatia "Não alocado".
     *
     * Assim, a soma da pizza é exatamente igual
     * ao total de receitas do mês.
     */
    const naoAlocado =
        Math.max(
            totalReceitas - totalAlocado,
            0,
        );

    if (naoAlocado > 0) {
        labels.push("Não alocado");
        valores.push(naoAlocado);
    }

    const valorExcedente =
        Math.max(
            totalAlocado - totalReceitas,
            0,
        );

    const percentualAlocado =
        totalReceitas > 0
            ? (totalAlocado / totalReceitas) * 100
            : 0;

    return {
        labels,
        valores,
        totalReceitas,
        totalAlocado,
        naoAlocado,
        valorExcedente,
        percentualAlocado,
    };
}


/**
 * Plugin local do Chart.js.
 *
 * Escreve o total de receitas no centro do doughnut.
 */
const pluginTextoCentralDoughnut = {
    id: "textoCentralDoughnut",

    afterDraw(chart, args, opcoes) {
        if (chart.config.type !== "doughnut") {
            return;
        }

        const {
            ctx,
            chartArea,
        } = chart;

        if (!chartArea) {
            return;
        }

        const centroX =
            (chartArea.left + chartArea.right) / 2;

        const centroY =
            (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = "#9ca3af";
        ctx.font =
            "600 12px Arial, sans-serif";

        ctx.fillText(
            opcoes.rotulo ?? "Renda do mês",
            centroX,
            centroY - 14,
        );

        ctx.fillStyle = "#f3f4f6";
        ctx.font =
            "700 20px Arial, sans-serif";

        ctx.fillText(
            formatarMoeda(
                opcoes.valor ?? 0,
            ),
            centroX,
            centroY + 12,
        );

        ctx.restore();
    },
};

function renderizarGraficoAlocacao(historico) {
    const titulo = obterElemento("titulo-grafico");
    const descricao = obterElemento("descricao-grafico");
    const resumo = obterElemento("resumo-grafico");

    titulo.textContent = "Alocação da renda no mês";
    descricao.textContent =
        "Distribuição das despesas, metas e valor ainda disponível";

    if (typeof Chart === "undefined") {
        mostrarGraficoVazio(
            "A biblioteca do gráfico não foi carregada.",
        );
        return;
    }

    if (!Array.isArray(historico) || historico.length === 0) {
        mostrarGraficoVazio(
            "Ainda não existem movimentações neste mês.",
        );
        return;
    }

    const dados =
        prepararDadosGraficoAlocacao(historico);

    /*
     * Sem receitas não existe um montante total da renda
     * para usar como base percentual.
     */
    if (dados.totalReceitas <= 0) {
        mostrarGraficoVazio(
            "Cadastre pelo menos uma receita para analisar a alocação da renda.",
        );
        return;
    }

    /*
     * Se não há despesas nem metas, mostramos apenas
     * a renda como "Não alocado".
     */
    if (dados.valores.length === 0) {
        mostrarGraficoVazio(
            "Ainda não existem despesas ou metas neste mês.",
        );
        return;
    }

    /*
     * O percentual pode passar de 100% quando as saídas
     * excedem a renda registrada.
     */
    resumo.textContent =
        `${dados.percentualAlocado.toFixed(1)}% da renda alocada`;

    resumo.classList.remove("oculto");

    const contexto = prepararCanvasGrafico();

    /*
     * Paleta suficiente para várias categorias.
     * O último cinza é reservado para "Não alocado".
     */
    const paleta = [
        "#6366f1",
        "#22c55e",
        "#f59e0b",
        "#ef4444",
        "#06b6d4",
        "#a855f7",
        "#ec4899",
        "#84cc16",
        "#14b8a6",
        "#f97316",
        "#64748b",
    ];

    const cores =
        dados.labels.map((rotulo, indice) => {
            if (rotulo === "Não alocado") {
                return "#374151";
            }

            return paleta[
                indice % paleta.length
            ];
        });

    graficoFinanceiro = new Chart(contexto, {
        type: "doughnut",

        data: {
            labels: dados.labels,

            datasets: [
                {
                    label: "Alocação",
                    data: dados.valores,
                    backgroundColor: cores,
                    borderColor: "#202126",
                    borderWidth: 3,
                    hoverOffset: 10,
                },
            ],
        },

        plugins: [
            pluginTextoCentralDoughnut,
        ],

        options: {
            responsive: true,
            maintainAspectRatio: false,

            /*
             * Controla o tamanho do espaço vazio no centro.
             */
            cutout: "62%",

            layout: {
                padding: 8,
            },

            plugins: {
                textoCentralDoughnut: {
                    rotulo: "Renda do mês",
                    valor: dados.totalReceitas,
                },

                legend: {
                    position: "right",

                    labels: {
                        color: "#f3f4f6",
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 16,
                        boxWidth: 10,
                    },
                },

                tooltip: {
                    backgroundColor: "#17171a",
                    borderColor: "#374151",
                    borderWidth: 1,
                    titleColor: "#f3f4f6",
                    bodyColor: "#f3f4f6",
                    padding: 12,

                    callbacks: {
                        label(contextoTooltip) {
                            const rotulo =
                                contextoTooltip.label;

                            const valor =
                                contextoTooltip.parsed;

                            /*
                             * A porcentagem é calculada contra
                             * a renda total, não contra o total
                             * das fatias.
                             */
                            const percentualDaRenda =
                                dados.totalReceitas > 0
                                    ? (
                                        valor /
                                        dados.totalReceitas
                                    ) * 100
                                    : 0;

                            return (
                                `${rotulo}: ` +
                                `${formatarMoeda(valor)} ` +
                                `(${percentualDaRenda.toFixed(1)}% da renda)`
                            );
                        },

                        afterBody() {
                            if (dados.valorExcedente <= 0) {
                                return [];
                            }

                            return [
                                "",
                                `Saídas acima da renda: ${formatarMoeda(dados.valorExcedente)}`,
                            ];
                        },
                    },
                },
            },
        },
    });
}
/* =========================================================
   CONTROLE ENTRE OS DOIS GRÁFICOS
   ========================================================= */

/**
 * Atualiza o estado visual dos botões.
 */
function atualizarBotoesModoGrafico() {
    const botoes =
        document.querySelectorAll(
            "[data-chart-mode]",
        );

    for (const botao of botoes) {
        const estaAtivo =
            botao.dataset.chartMode ===
            modoGraficoAtual;

        botao.classList.toggle(
            "ativo",
            estaAtivo,
        );

        botao.setAttribute(
            "aria-selected",
            String(estaAtivo),
        );
    }
}


/**
 * Desenha o gráfico correspondente à aba atual.
 */
function renderizarModoGraficoAtual() {
    const {
        historico,
        ano,
        indiceMes,
    } = contextoGraficoAtual;

    if (modoGraficoAtual === "alocacao") {
        renderizarGraficoAlocacao(
            historico,
        );
        return;
    }

    renderizarGraficoFluxo(
        historico,
        ano,
        indiceMes,
    );
}





/**
 * Cria ou recria o gráfico financeiro.
 *
 * O gráfico mistura:
 * - barras verdes para receitas;
 * - barras vermelhas para despesas;
 * - linha roxa para resultado acumulado.
 */
function renderizarGraficoFinanceiro(
    historico,
    ano,
    indiceMes,
) {
    contextoGraficoAtual = {
        historico:
            Array.isArray(historico)
                ? historico
                : [],
        ano,
        indiceMes,
    };

    renderizarModoGraficoAtual();
}

function configurarSeletorGraficos() {
    const botoes =
        document.querySelectorAll(
            "[data-chart-mode]",
        );

    for (const botao of botoes) {
        botao.addEventListener(
            "click",
            () => {
                const novoModo =
                    botao.dataset.chartMode;

                if (
                    novoModo !== "fluxo" &&
                    novoModo !== "alocacao"
                ) {
                    return;
                }

                if (
                    novoModo ===
                    modoGraficoAtual
                ) {
                    return;
                }

                modoGraficoAtual = novoModo;

                atualizarBotoesModoGrafico();
                renderizarModoGraficoAtual();
            },
        );
    }

    atualizarBotoesModoGrafico();
}



async function carregarDashboard(
    direcaoAnimacao = 0,
) {
    const idDesteCarregamento =
        ++sequenciaCarregamentoDashboard;

    const {
        indiceMes,
        ano,
        mesFormatado,
    } = obterPeriodoSelecionado();

    atualizarControlesNavegacaoMensal();
    definirCarregamentoDoPeriodo(true);

    try {
        const [
            dadosSaldo,
            dadosExtrato,
        ] = await Promise.all([
            buscarJson(
                `${API_URL}/dashboard/saldo?mes=${mesFormatado}&ano=${ano}`,
            ),

            buscarJson(
                `${API_URL}/transacoes?mes=${mesFormatado}&ano=${ano}`,
            ),
        ]);

        /*
         * Caso outro carregamento tenha começado depois,
         * ignoramos esta resposta antiga.
         */
        if (
            idDesteCarregamento !==
            sequenciaCarregamentoDashboard
        ) {
            return;
        }

        const historico =
            Array.isArray(
                dadosExtrato.historico,
            )
                ? dadosExtrato.historico
                : [];

        atualizarResumo(
            dadosSaldo,
        );

        renderizarTransacoes(
            historico,
        );

        renderizarMiniLista(
            "lista-mini-despesas",
            historico,
            "despesa",
        );

        renderizarMiniLista(
            "lista-mini-receitas",
            historico,
            "receita",
        );

        /*
         * Os dois gráficos que já criamos recebem
         * automaticamente o mês escolhido.
         */
        renderizarGraficoFinanceiro(
            historico,
            ano,
            indiceMes,
        );

        animarConteudoDoPeriodo(
            direcaoAnimacao,
        );
    } catch (erro) {
        /*
         * Também ignoramos erros de uma chamada obsoleta.
         */
        if (
            idDesteCarregamento !==
            sequenciaCarregamentoDashboard
        ) {
            return;
        }

        mostrarErroNoDashboard(
            erro,
        );

        if (
            typeof mostrarGraficoVazio ===
            "function"
        ) {
            mostrarGraficoVazio(
                "Não foi possível carregar os dados deste mês.",
            );
        }
    } finally {
        if (
            idDesteCarregamento ===
            sequenciaCarregamentoDashboard
        ) {
            definirCarregamentoDoPeriodo(
                false,
            );
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    configurarPopovers();
    configurarModalTransacao();
    configurarGerenciadorCategorias();
    configurarSeletorGraficos();
    configurarNavegacaoMensal();

    carregarCategoriasParaModal();
    carregarDashboard();

});
