// URL base da API FastAPI.
const API_URL =
    window.FINDASH_API_URL ??
    "http://127.0.0.1:8000";

// Estado local da página.
let bancoDeMetas = [];
let metaSelecionadaParaAporte = null;

// Quando não é null, o modal principal está editando uma meta.
let metaEmEdicaoId = null;
let metaOriginalEmEdicao = null;


// =========================================================
// UTILITÁRIOS
// =========================================================

function obterElemento(id) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        throw new Error(
            `Elemento HTML não encontrado: #${id}`,
        );
    }

    return elemento;
}


function normalizarNumero(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


function formatarMoeda(valor) {
    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
        },
    ).format(
        normalizarNumero(valor),
    );
}


function obterDataLocalISO() {
    const agora = new Date();

    const ano =
        agora.getFullYear();

    const mes =
        String(
            agora.getMonth() + 1,
        ).padStart(2, "0");

    const dia =
        String(
            agora.getDate(),
        ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


/**
 * Faz uma requisição e transforma respostas HTTP inválidas
 * em erros compreensíveis para a interface.
 */
async function buscarJson(
    url,
    opcoes = {},
) {
    let resposta;

    try {
        resposta =
            await fetch(
                url,
                opcoes,
            );
    } catch (erroConexao) {
        throw new Error(
            "Não foi possível conectar à API. " +
            "Verifique se o FastAPI está em execução.",
        );
    }

    let dados = null;

    try {
        dados =
            await resposta.json();
    } catch {
        // Respostas vazias também são aceitas.
    }

    if (!resposta.ok) {
        const detalhe =
            dados?.detail ??
            dados?.erro ??
            dados?.error ??
            `Erro HTTP ${resposta.status}`;

        throw new Error(
            Array.isArray(detalhe)
                ? detalhe
                    .map(
                        (item) =>
                            item.msg ??
                            JSON.stringify(item),
                    )
                    .join("\n")
                : String(detalhe),
        );
    }

    /*
     * A versão antiga do POST /metas devolvia
     * {"erro": "..."} com status 200.
     * Esta verificação mantém o frontend compatível.
     */
    if (dados?.erro) {
        throw new Error(
            String(dados.erro),
        );
    }

    return dados ?? {};
}


/**
 * Mostra uma notificação curta sem bloquear a página.
 */
function mostrarToast(
    mensagem,
    tipo = "sucesso",
) {
    const container =
        obterElemento("toast-container");

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${tipo}`;

    const icone =
        document.createElement("i");

    icone.className =
        tipo === "erro"
            ? "fa-solid fa-circle-exclamation"
            : "fa-solid fa-circle-check";

    const texto =
        document.createElement("span");

    texto.textContent = mensagem;

    toast.append(
        icone,
        texto,
    );

    container.appendChild(toast);

    window.setTimeout(
        () => {
            toast.classList.add(
                "saindo",
            );

            window.setTimeout(
                () => toast.remove(),
                220,
            );
        },
        3500,
    );
}


/**
 * Cria um elemento com texto seguro.
 */
function criarElemento(
    tag,
    classe = "",
    texto = "",
) {
    const elemento =
        document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== "") {
        elemento.textContent = texto;
    }

    return elemento;
}


// =========================================================
// CÁLCULOS E NORMALIZAÇÃO DAS METAS
// =========================================================

function normalizarMeta(meta) {
    const valorAlvo =
        normalizarNumero(
            meta.valor_alvo,
        );

    const valorPoupado =
        normalizarNumero(
            meta.valor_poupado,
        );

    const percentualCalculado =
        valorAlvo > 0
            ? (
                valorPoupado /
                valorAlvo
            ) * 100
            : 0;

    const percentual =
        normalizarNumero(
            meta.porcentagem_concluida,
        ) || percentualCalculado;

    const concluida =
        valorAlvo > 0 &&
        valorPoupado >= valorAlvo;

    return {
        id:
            normalizarNumero(meta.id),

        nome:
            String(
                meta.nome ??
                "Meta sem nome",
            ),

        valor_alvo:
            valorAlvo,

        prazo_meses:
            normalizarNumero(
                meta.prazo_meses,
            ),

        valor_mensal_projetado:
            normalizarNumero(
                meta.valor_mensal_projetado ??
                meta.valor_mensal,
            ),

        valor_poupado:
            valorPoupado,

        porcentagem_concluida:
            percentual,

        status:
            concluida
                ? "Concluída"
                : String(
                    meta.status ??
                    "Em andamento",
                ),

        concluida,

        valor_restante:
            Math.max(
                valorAlvo -
                valorPoupado,
                0,
            ),
    };
}


function obterResumoDasMetas(
    metas,
) {
    return metas.reduce(
        (resumo, meta) => {
            resumo.valorAlvo +=
                meta.valor_alvo;

            resumo.valorPoupado +=
                meta.valor_poupado;

            resumo.valorRestante +=
                meta.valor_restante;

            if (!meta.concluida) {
                resumo.metasAtivas += 1;
            }

            return resumo;
        },
        {
            metasAtivas: 0,
            valorAlvo: 0,
            valorPoupado: 0,
            valorRestante: 0,
        },
    );
}


function atualizarResumoDasMetas() {
    const resumo =
        obterResumoDasMetas(
            bancoDeMetas,
        );

    obterElemento(
        "resumo-metas-ativas",
    ).textContent =
        String(resumo.metasAtivas);

    obterElemento(
        "resumo-valor-alvo",
    ).textContent =
        formatarMoeda(
            resumo.valorAlvo,
        );

    obterElemento(
        "resumo-valor-poupado",
    ).textContent =
        formatarMoeda(
            resumo.valorPoupado,
        );

    obterElemento(
        "resumo-valor-restante",
    ).textContent =
        formatarMoeda(
            resumo.valorRestante,
        );
}


// =========================================================
// RENDERIZAÇÃO DOS CARTÕES
// =========================================================

function criarEstadoVazioDasMetas() {
    const estado =
        criarElemento(
            "div",
            "goals-empty-state",
        );

    const icone =
        criarElemento(
            "div",
            "goals-empty-icon",
        );

    icone.innerHTML =
        '<i class="fa-solid fa-bullseye"></i>';

    const titulo =
        criarElemento(
            "h2",
            "",
            "Nenhuma meta encontrada",
        );

    const texto =
        criarElemento(
            "p",
            "",
            "Crie uma meta financeira ou altere os filtros atuais.",
        );

    const botao =
        criarElemento(
            "button",
            "btn-primary",
        );

    botao.type = "button";
    botao.innerHTML =
        '<i class="fa-solid fa-plus"></i> Criar primeira meta';

    botao.addEventListener(
        "click",
        abrirModalNovaMeta,
    );

    estado.append(
        icone,
        titulo,
        texto,
        botao,
    );

    return estado;
}


function criarCartaoMeta(meta) {
    const cartao =
        criarElemento(
            "article",
            "goal-card",
        );

    if (meta.concluida) {
        cartao.classList.add(
            "concluida",
        );
    }

    // -----------------------------------------------------
    // Cabeçalho
    // -----------------------------------------------------

    const cabecalho =
        criarElemento(
            "div",
            "goal-card-header",
        );

    const blocoTitulo =
        criarElemento("div");

    const titulo =
        criarElemento(
            "h2",
            "",
            meta.nome,
        );

    const badge =
        criarElemento(
            "span",
            meta.concluida
                ? "goal-status-badge concluida"
                : "goal-status-badge andamento",
            meta.status,
        );

    blocoTitulo.append(
        titulo,
        badge,
    );

    const ferramentas =
        criarElemento(
            "div",
            "goal-card-header-tools",
        );

    const acoesGerenciamento =
        criarElemento(
            "div",
            "goal-management-actions",
        );

    const btnEditar =
        criarElemento(
            "button",
            "goal-management-button edit",
        );

    btnEditar.type = "button";
    btnEditar.title = "Editar meta";
    btnEditar.setAttribute(
        "aria-label",
        `Editar meta ${meta.nome}`,
    );
    btnEditar.innerHTML =
        '<i class="fa-solid fa-pen"></i>';

    btnEditar.addEventListener(
        "click",
        () => abrirModalEditarMeta(meta),
    );

    const btnExcluir =
        criarElemento(
            "button",
            "goal-management-button delete",
        );

    btnExcluir.type = "button";
    btnExcluir.title = "Excluir meta";
    btnExcluir.setAttribute(
        "aria-label",
        `Excluir meta ${meta.nome}`,
    );
    btnExcluir.innerHTML =
        '<i class="fa-solid fa-trash"></i>';

    btnExcluir.addEventListener(
        "click",
        () => excluirMeta(meta, btnExcluir),
    );

    acoesGerenciamento.append(
        btnEditar,
        btnExcluir,
    );

    const icone =
        criarElemento(
            "div",
            meta.concluida
                ? "goal-card-icon concluida"
                : "goal-card-icon",
        );

    icone.innerHTML =
        meta.concluida
            ? '<i class="fa-solid fa-trophy"></i>'
            : '<i class="fa-solid fa-bullseye"></i>';

    ferramentas.append(
        acoesGerenciamento,
        icone,
    );

    cabecalho.append(
        blocoTitulo,
        ferramentas,
    );

    // -----------------------------------------------------
    // Valores principais
    // -----------------------------------------------------

    const valores =
        criarElemento(
            "div",
            "goal-values",
        );

    const valorPoupado =
        criarElemento("div");

    valorPoupado.append(
        criarElemento(
            "span",
            "",
            "Reservado",
        ),
        criarElemento(
            "strong",
            "",
            formatarMoeda(
                meta.valor_poupado,
            ),
        ),
    );

    const valorAlvo =
        criarElemento("div");

    valorAlvo.append(
        criarElemento(
            "span",
            "",
            "Objetivo",
        ),
        criarElemento(
            "strong",
            "",
            formatarMoeda(
                meta.valor_alvo,
            ),
        ),
    );

    valores.append(
        valorPoupado,
        valorAlvo,
    );

    // -----------------------------------------------------
    // Barra de progresso
    // -----------------------------------------------------

    const progressoCabecalho =
        criarElemento(
            "div",
            "goal-progress-header",
        );

    const percentualTexto =
        criarElemento(
            "span",
            "",
            `${meta.porcentagem_concluida.toFixed(1)}% concluída`,
        );

    const restanteTexto =
        criarElemento(
            "span",
            "",
            meta.concluida
                ? "Objetivo alcançado"
                : `${formatarMoeda(meta.valor_restante)} restantes`,
        );

    progressoCabecalho.append(
        percentualTexto,
        restanteTexto,
    );

    const trilho =
        criarElemento(
            "div",
            "goal-progress-track",
        );

    const preenchimento =
        criarElemento(
            "div",
            "goal-progress-fill",
        );

    const percentualVisual =
        Math.min(
            Math.max(
                meta.porcentagem_concluida,
                0,
            ),
            100,
        );

    preenchimento.style.width =
        `${percentualVisual}%`;

    trilho.appendChild(
        preenchimento,
    );

    // -----------------------------------------------------
    // Planejamento
    // -----------------------------------------------------

    const detalhes =
        criarElemento(
            "div",
            "goal-plan-details",
        );

    const mensal =
        criarElemento(
            "div",
            "goal-plan-detail",
        );

    mensal.innerHTML =
        '<i class="fa-solid fa-coins"></i>';

    const textoMensal =
        criarElemento("div");

    textoMensal.append(
        criarElemento(
            "span",
            "",
            "Planejado por mês",
        ),
        criarElemento(
            "strong",
            "",
            formatarMoeda(
                meta.valor_mensal_projetado,
            ),
        ),
    );

    mensal.appendChild(
        textoMensal,
    );

    const prazo =
        criarElemento(
            "div",
            "goal-plan-detail",
        );

    prazo.innerHTML =
        '<i class="fa-regular fa-calendar"></i>';

    const textoPrazo =
        criarElemento("div");

    textoPrazo.append(
        criarElemento(
            "span",
            "",
            "Prazo estimado",
        ),
        criarElemento(
            "strong",
            "",
            meta.prazo_meses > 0
                ? `${meta.prazo_meses} ${
                    meta.prazo_meses === 1
                        ? "mês"
                        : "meses"
                }`
                : "Não informado",
        ),
    );

    prazo.appendChild(
        textoPrazo,
    );

    detalhes.append(
        mensal,
        prazo,
    );

    // -----------------------------------------------------
    // Ações
    // -----------------------------------------------------

    const acoes =
        criarElemento(
            "div",
            "goal-card-actions",
        );

    const btnAporte =
        criarElemento(
            "button",
            "btn-primary goal-contribution-button",
        );

    btnAporte.type = "button";
    btnAporte.innerHTML =
        '<i class="fa-solid fa-piggy-bank"></i> Adicionar aporte';

    if (meta.concluida) {
        btnAporte.disabled = true;
        btnAporte.title =
            "Esta meta já foi concluída.";
    } else {
        btnAporte.addEventListener(
            "click",
            () => abrirModalAporte(meta),
        );
    }

    const linkMovimentacoes =
        criarElemento(
            "a",
            "goal-history-link",
        );

    const parametros =
        new URLSearchParams({
            meta_id:
                String(meta.id),
            meta_nome:
                meta.nome,
        });

    linkMovimentacoes.href =
        `transacoes.html?${parametros.toString()}`;

    linkMovimentacoes.innerHTML =
        '<i class="fa-solid fa-clock-rotate-left"></i> Ver movimentações';

    acoes.append(
        btnAporte,
        linkMovimentacoes,
    );

    cartao.append(
        cabecalho,
        valores,
        progressoCabecalho,
        trilho,
        detalhes,
        acoes,
    );

    return cartao;
}


/**
 * Exclui somente a meta. O backend preserva as transações
 * financeiras e remove apenas o vínculo meta_id.
 */
async function excluirMeta(
    meta,
    botao,
) {
    const possuiAportes =
        meta.valor_poupado > 0;

    const avisoAportes =
        possuiAportes
            ? "\n\nAs movimentações já registradas permanecerão no histórico financeiro, mas deixarão de pertencer a esta meta."
            : "";

    const confirmou =
        window.confirm(
            `Excluir a meta “${meta.nome}”?` +
            avisoAportes +
            "\n\nEsta ação não pode ser desfeita.",
        );

    if (!confirmou) {
        return;
    }

    const conteudoOriginal =
        botao.innerHTML;

    botao.disabled = true;
    botao.innerHTML =
        '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const dados =
            await buscarJson(
                `${API_URL}/metas/${meta.id}`,
                {
                    method: "DELETE",
                },
            );

        mostrarToast(
            dados.mensagem ??
            "Meta excluída com sucesso.",
        );

        await carregarMetas();
    } catch (erro) {
        mostrarToast(
            erro.message,
            "erro",
        );
    } finally {
        botao.disabled = false;
        botao.innerHTML =
            conteudoOriginal;
    }
}


function aplicarFiltrosDasMetas() {
    const busca =
        obterElemento(
            "filtro-busca-meta",
        ).value
            .trim()
            .toLowerCase();

    const status =
        obterElemento(
            "filtro-status-meta",
        ).value;

    const filtradas =
        bancoDeMetas.filter(
            (meta) => {
                const atendeBusca =
                    meta.nome
                        .toLowerCase()
                        .includes(busca);

                let atendeStatus = true;

                if (
                    status === "andamento"
                ) {
                    atendeStatus =
                        !meta.concluida;
                } else if (
                    status === "concluida"
                ) {
                    atendeStatus =
                        meta.concluida;
                }

                return (
                    atendeBusca &&
                    atendeStatus
                );
            },
        );

    const lista =
        obterElemento(
            "lista-metas",
        );

    lista.replaceChildren();

    if (
        filtradas.length === 0
    ) {
        lista.appendChild(
            criarEstadoVazioDasMetas(),
        );

        return;
    }

    const fragmento =
        document.createDocumentFragment();

    for (const meta of filtradas) {
        fragmento.appendChild(
            criarCartaoMeta(meta),
        );
    }

    lista.appendChild(
        fragmento,
    );
}


// =========================================================
// API: CARREGAMENTO DAS METAS
// =========================================================

async function carregarMetas() {
    const lista =
        obterElemento(
            "lista-metas",
        );

    lista.innerHTML = `
        <div class="goals-loading-state">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>Carregando metas...</p>
        </div>
    `;

    try {
        const dados =
            await buscarJson(
                `${API_URL}/metas`,
            );

        const metas =
            Array.isArray(dados.metas)
                ? dados.metas
                : [];

        bancoDeMetas =
            metas.map(
                normalizarMeta,
            );

        atualizarResumoDasMetas();
        aplicarFiltrosDasMetas();
    } catch (erro) {
        console.error(
            "Erro ao carregar metas:",
            erro,
        );

        lista.replaceChildren();

        const estado =
            criarElemento(
                "div",
                "goals-empty-state error",
            );

        estado.innerHTML =
            '<div class="goals-empty-icon">' +
            '<i class="fa-solid fa-triangle-exclamation"></i>' +
            '</div>';

        estado.append(
            criarElemento(
                "h2",
                "",
                "Não foi possível carregar as metas",
            ),
            criarElemento(
                "p",
                "",
                erro.message,
            ),
        );

        const tentarNovamente =
            criarElemento(
                "button",
                "btn-primary",
            );

        tentarNovamente.type =
            "button";

        tentarNovamente.innerHTML =
            '<i class="fa-solid fa-rotate-right"></i> Tentar novamente';

        tentarNovamente.addEventListener(
            "click",
            carregarMetas,
        );

        estado.appendChild(
            tentarNovamente,
        );

        lista.appendChild(
            estado,
        );
    }
}


// =========================================================
// MODAL: CRIAÇÃO DA META
// =========================================================

function obterModoPlanejamento() {
    const selecionado =
        document.querySelector(
            'input[name="modo_planejamento"]:checked',
        );

    return (
        selecionado?.value ??
        "prazo"
    );
}


function atualizarVisualModoPlanejamento() {
    const modo =
        obterModoPlanejamento();

    const grupoPrazo =
        obterElemento(
            "grupo-prazo-meta",
        );

    const grupoMensal =
        obterElemento(
            "grupo-mensal-meta",
        );

    const inputPrazo =
        obterElemento(
            "input-prazo-meta",
        );

    const inputMensal =
        obterElemento(
            "input-valor-mensal-meta",
        );

    grupoPrazo.classList.toggle(
        "oculto",
        modo !== "prazo",
    );

    grupoMensal.classList.toggle(
        "oculto",
        modo !== "mensal",
    );

    inputPrazo.required =
        modo === "prazo";

    inputMensal.required =
        modo === "mensal";

    for (
        const opcao of
        document.querySelectorAll(
            ".goal-plan-option",
        )
    ) {
        const radio =
            opcao.querySelector(
                'input[type="radio"]',
            );

        opcao.classList.toggle(
            "ativo",
            radio?.checked === true,
        );
    }

    atualizarPreviewPlanejamento();
}


function obterValorBaseDoPlanejamento() {
    const valorAlvo =
        normalizarNumero(
            obterElemento(
                "input-valor-alvo-meta",
            ).value,
        );

    if (!metaOriginalEmEdicao) {
        return Math.max(
            valorAlvo,
            0,
        );
    }

    return Math.max(
        valorAlvo -
        metaOriginalEmEdicao.valor_poupado,
        0,
    );
}


function calcularPlanejamentoDaMeta() {
    const valorBase =
        obterValorBaseDoPlanejamento();

    const modo =
        obterModoPlanejamento();

    if (valorBase <= 0) {
        return {
            valorMensal: 0,
            prazo: 0,
            ultimaParcela: 0,
        };
    }

    if (modo === "prazo") {
        const prazo =
            Math.trunc(
                normalizarNumero(
                    obterElemento(
                        "input-prazo-meta",
                    ).value,
                ),
            );

        if (prazo <= 0) {
            return {
                valorMensal: 0,
                prazo: 0,
                ultimaParcela: 0,
            };
        }

        const valorMensal =
            valorBase / prazo;

        return {
            valorMensal,
            prazo,
            ultimaParcela:
                valorBase -
                valorMensal *
                (prazo - 1),
        };
    }

    const valorMensal =
        normalizarNumero(
            obterElemento(
                "input-valor-mensal-meta",
            ).value,
        );

    if (valorMensal <= 0) {
        return {
            valorMensal: 0,
            prazo: 0,
            ultimaParcela: 0,
        };
    }

    const prazo =
        Math.ceil(
            valorBase /
            valorMensal,
        );

    const ultimaParcela =
        valorBase -
        valorMensal *
        (prazo - 1);

    return {
        valorMensal,
        prazo,
        ultimaParcela:
            Math.max(
                ultimaParcela,
                0,
            ),
    };
}


function atualizarAvisoEdicaoMeta() {
    const aviso =
        obterElemento(
            "aviso-edicao-meta",
        );

    const texto =
        obterElemento(
            "texto-aviso-edicao-meta",
        );

    if (!metaOriginalEmEdicao) {
        aviso.classList.add(
            "oculto",
        );
        aviso.classList.remove(
            "perigo",
        );
        texto.textContent = "";
        return;
    }

    const valorAlvo =
        normalizarNumero(
            obterElemento(
                "input-valor-alvo-meta",
            ).value,
        );

    const poupado =
        metaOriginalEmEdicao
            .valor_poupado;

    aviso.classList.remove(
        "oculto",
    );

    if (valorAlvo <= poupado) {
        aviso.classList.add(
            "perigo",
        );

        texto.textContent =
            `Já existem ${formatarMoeda(poupado)} reservados. ` +
            "Com este novo valor-alvo, a meta será considerada concluída e o planejamento restante ficará zerado.";

        return;
    }

    aviso.classList.remove(
        "perigo",
    );

    const restante =
        valorAlvo - poupado;

    texto.textContent =
        `O novo planejamento será calculado sobre ${formatarMoeda(restante)}, ` +
        `pois ${formatarMoeda(poupado)} já estão reservados.`;
}


function atualizarPreviewPlanejamento() {
    const calculo =
        calcularPlanejamentoDaMeta();

    obterElemento(
        "preview-valor-mensal",
    ).textContent =
        formatarMoeda(
            calculo.valorMensal,
        );

    obterElemento(
        "preview-prazo",
    ).textContent =
        calculo.prazo > 0
            ? `${calculo.prazo} ${
                calculo.prazo === 1
                    ? "mês"
                    : "meses"
            }`
            : "—";

    obterElemento(
        "preview-ultima-parcela",
    ).textContent =
        formatarMoeda(
            calculo.ultimaParcela,
        );

    atualizarAvisoEdicaoMeta();
}


function prepararModalMetaParaCriacao() {
    metaEmEdicaoId = null;
    metaOriginalEmEdicao = null;

    obterElemento(
        "titulo-modal-meta",
    ).textContent =
        "Nova Meta";

    obterElemento(
        "subtitulo-modal-meta",
    ).textContent =
        "Defina o objetivo e como pretende alcançá-lo.";

    obterElemento(
        "btn-salvar-meta",
    ).innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Criar Meta';
}


function abrirModalNovaMeta() {
    const modal =
        obterElemento("modal-meta");

    const form =
        obterElemento("form-meta");

    form.reset();
    prepararModalMetaParaCriacao();

    const radioPrazo =
        form.querySelector(
            'input[value="prazo"]',
        );

    if (radioPrazo) {
        radioPrazo.checked = true;
    }

    atualizarVisualModoPlanejamento();

    modal.classList.remove(
        "oculto",
    );

    obterElemento(
        "input-nome-meta",
    ).focus();
}


function abrirModalEditarMeta(meta) {
    const modal =
        obterElemento("modal-meta");

    const form =
        obterElemento("form-meta");

    form.reset();

    metaEmEdicaoId = meta.id;
    metaOriginalEmEdicao = meta;

    obterElemento(
        "titulo-modal-meta",
    ).textContent =
        "Editar Meta";

    obterElemento(
        "subtitulo-modal-meta",
    ).textContent =
        "Altere o objetivo. O novo planejamento considera somente o valor que ainda falta.";

    obterElemento(
        "btn-salvar-meta",
    ).innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';

    obterElemento(
        "input-nome-meta",
    ).value =
        meta.nome;

    obterElemento(
        "input-valor-alvo-meta",
    ).value =
        String(meta.valor_alvo);

    const radioPrazo =
        form.querySelector(
            'input[value="prazo"]',
        );

    if (radioPrazo) {
        radioPrazo.checked = true;
    }

    obterElemento(
        "input-prazo-meta",
    ).value =
        String(
            meta.prazo_meses > 0
                ? meta.prazo_meses
                : 1,
        );

    obterElemento(
        "input-valor-mensal-meta",
    ).value =
        meta.valor_mensal_projetado > 0
            ? String(
                meta.valor_mensal_projetado,
            )
            : "";

    atualizarVisualModoPlanejamento();

    modal.classList.remove(
        "oculto",
    );

    obterElemento(
        "input-nome-meta",
    ).focus();
}


function fecharModalNovaMeta() {
    obterElemento(
        "modal-meta",
    ).classList.add(
        "oculto",
    );

    metaEmEdicaoId = null;
    metaOriginalEmEdicao = null;
}


async function salvarNovaMeta(
    evento,
) {
    evento.preventDefault();

    const estaEditando =
        metaEmEdicaoId !== null;

    const botao =
        obterElemento(
            "btn-salvar-meta",
        );

    const conteudoOriginal =
        botao.innerHTML;

    botao.disabled = true;
    botao.innerHTML =
        estaEditando
            ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...'
            : '<i class="fa-solid fa-circle-notch fa-spin"></i> Criando...';

    try {
        const nome =
            obterElemento(
                "input-nome-meta",
            ).value.trim();

        const valorAlvo =
            normalizarNumero(
                obterElemento(
                    "input-valor-alvo-meta",
                ).value,
            );

        const modo =
            obterModoPlanejamento();

        if (!nome) {
            throw new Error(
                "Informe um nome para a meta.",
            );
        }

        if (valorAlvo <= 0) {
            throw new Error(
                "O valor-alvo deve ser maior que zero.",
            );
        }

        const payload = {
            nome,
            valor_alvo:
                valorAlvo,
            prazo_meses:
                null,
            valor_mensal:
                null,
        };

        if (modo === "prazo") {
            const prazo =
                Math.trunc(
                    normalizarNumero(
                        obterElemento(
                            "input-prazo-meta",
                        ).value,
                    ),
                );

            if (prazo <= 0) {
                throw new Error(
                    "O prazo deve ser de pelo menos um mês.",
                );
            }

            payload.prazo_meses =
                prazo;
        } else {
            const valorMensal =
                normalizarNumero(
                    obterElemento(
                        "input-valor-mensal-meta",
                    ).value,
                );

            if (valorMensal <= 0) {
                throw new Error(
                    "O valor mensal deve ser maior que zero.",
                );
            }

            payload.valor_mensal =
                valorMensal;
        }

        const endpoint =
            estaEditando
                ? `${API_URL}/metas/${metaEmEdicaoId}`
                : `${API_URL}/metas`;

        const metodo =
            estaEditando
                ? "PUT"
                : "POST";

        const dados =
            await buscarJson(
                endpoint,
                {
                    method: metodo,

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify(
                            payload,
                        ),
                },
            );

        fecharModalNovaMeta();

        const mensagemBase =
            dados.mensagem ??
            (
                estaEditando
                    ? "Meta atualizada com sucesso."
                    : "Meta criada com sucesso."
            );

        mostrarToast(
            dados.aviso
                ? `${mensagemBase} ${dados.aviso}`
                : mensagemBase,
        );

        await carregarMetas();
    } catch (erro) {
        mostrarToast(
            erro.message,
            "erro",
        );
    } finally {
        botao.disabled = false;
        botao.innerHTML =
            conteudoOriginal;
    }
}


// =========================================================
// MODAL: APORTE
// =========================================================

async function carregarCategoriasDoAporte() {
    const select =
        obterElemento(
            "select-categoria-aporte",
        );

    select.replaceChildren();

    const carregando =
        criarElemento(
            "option",
            "",
            "Carregando categorias...",
        );

    carregando.value = "";
    carregando.disabled = true;
    carregando.selected = true;

    select.appendChild(
        carregando,
    );

    const dados =
        await buscarJson(
            `${API_URL}/categorias`,
        );

    const categorias =
        Array.isArray(dados.categorias)
            ? dados.categorias
            : Array.isArray(dados)
                ? dados
                : [];

    select.replaceChildren();

    const placeholder =
        criarElemento(
            "option",
            "",
            categorias.length > 0
                ? "Selecione uma categoria..."
                : "Nenhuma categoria cadastrada",
        );

    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;

    select.appendChild(
        placeholder,
    );

    let categoriaSugerida = null;

    for (const categoria of categorias) {
        const opcao =
            criarElemento(
                "option",
                "",
                String(categoria.nome),
            );

        opcao.value =
            String(categoria.id);

        select.appendChild(
            opcao,
        );

        const nome =
            String(
                categoria.nome,
            ).toLowerCase();

        if (
            !categoriaSugerida &&
            (
                nome.includes("meta") ||
                nome.includes("reserva") ||
                nome.includes("poup")
            )
        ) {
            categoriaSugerida =
                String(categoria.id);
        }
    }

    if (categoriaSugerida) {
        select.value =
            categoriaSugerida;
    }
}


async function abrirModalAporte(meta) {
    metaSelecionadaParaAporte =
        meta;

    const modal =
        obterElemento(
            "modal-aporte",
        );

    const form =
        obterElemento(
            "form-aporte",
        );

    form.reset();

    obterElemento(
        "input-aporte-meta-id",
    ).value =
        String(meta.id);

    obterElemento(
        "subtitulo-modal-aporte",
    ).textContent =
        `Meta: ${meta.nome}`;

    obterElemento(
        "input-descricao-aporte",
    ).value =
        `Aporte - ${meta.nome}`;

    const inputValor =
        obterElemento(
            "input-valor-aporte",
        );

    inputValor.max =
        String(meta.valor_restante);

    inputValor.placeholder =
        `Máximo: ${formatarMoeda(meta.valor_restante)}`;

    obterElemento(
        "input-data-aporte",
    ).value =
        obterDataLocalISO();

    modal.classList.remove(
        "oculto",
    );

    try {
        await carregarCategoriasDoAporte();
    } catch (erro) {
        mostrarToast(
            erro.message,
            "erro",
        );
    }

    inputValor.focus();
}


function fecharModalAporte() {
    obterElemento(
        "modal-aporte",
    ).classList.add(
        "oculto",
    );

    metaSelecionadaParaAporte =
        null;
}


async function salvarAporte(
    evento,
) {
    evento.preventDefault();

    if (!metaSelecionadaParaAporte) {
        mostrarToast(
            "Nenhuma meta foi selecionada.",
            "erro",
        );

        return;
    }

    const botao =
        obterElemento(
            "btn-salvar-aporte",
        );

    const conteudoOriginal =
        botao.innerHTML;

    botao.disabled = true;
    botao.innerHTML =
        '<i class="fa-solid fa-circle-notch fa-spin"></i> Registrando...';

    try {
        const formData =
            new FormData(
                evento.currentTarget,
            );

        const valor =
            normalizarNumero(
                formData.get("valor"),
            );

        const categoriaId =
            Number.parseInt(
                formData.get(
                    "categoria_id",
                ),
                10,
            );

        if (valor <= 0) {
            throw new Error(
                "O valor do aporte deve ser maior que zero.",
            );
        }

        if (
            valor >
            metaSelecionadaParaAporte
                .valor_restante +
                0.001
        ) {
            throw new Error(
                "O aporte não pode ultrapassar o valor restante da meta.",
            );
        }

        if (
            !Number.isInteger(
                categoriaId,
            )
        ) {
            throw new Error(
                "Selecione uma categoria para o aporte.",
            );
        }

        const payload = {
            descricao:
                String(
                    formData.get(
                        "descricao",
                    ) ?? "",
                ).trim(),

            valor,

            tipo:
                "despesa",

            data:
                String(
                    formData.get(
                        "data",
                    ) ?? "",
                ),

            categoria_id:
                categoriaId,

            meta_id:
                metaSelecionadaParaAporte.id,
        };

        await buscarJson(
            `${API_URL}/transacoes`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify(
                        payload,
                    ),
            },
        );

        fecharModalAporte();

        mostrarToast(
            "Aporte registrado com sucesso.",
        );

        await carregarMetas();
    } catch (erro) {
        mostrarToast(
            erro.message,
            "erro",
        );
    } finally {
        botao.disabled = false;
        botao.innerHTML =
            conteudoOriginal;
    }
}


// =========================================================
// EVENTOS E INICIALIZAÇÃO
// =========================================================

function configurarModais() {
    obterElemento(
        "btn-nova-meta",
    ).addEventListener(
        "click",
        abrirModalNovaMeta,
    );

    obterElemento(
        "btn-fechar-modal-meta",
    ).addEventListener(
        "click",
        fecharModalNovaMeta,
    );

    obterElemento(
        "btn-cancelar-modal-meta",
    ).addEventListener(
        "click",
        fecharModalNovaMeta,
    );

    obterElemento(
        "btn-fechar-modal-aporte",
    ).addEventListener(
        "click",
        fecharModalAporte,
    );

    obterElemento(
        "btn-cancelar-modal-aporte",
    ).addEventListener(
        "click",
        fecharModalAporte,
    );

    obterElemento(
        "modal-meta",
    ).addEventListener(
        "click",
        (evento) => {
            if (
                evento.target ===
                evento.currentTarget
            ) {
                fecharModalNovaMeta();
            }
        },
    );

    obterElemento(
        "modal-aporte",
    ).addEventListener(
        "click",
        (evento) => {
            if (
                evento.target ===
                evento.currentTarget
            ) {
                fecharModalAporte();
            }
        },
    );

    document.addEventListener(
        "keydown",
        (evento) => {
            if (
                evento.key !==
                "Escape"
            ) {
                return;
            }

            fecharModalNovaMeta();
            fecharModalAporte();
        },
    );
}


function configurarFormularioMeta() {
    const form =
        obterElemento(
            "form-meta",
        );

    form.addEventListener(
        "submit",
        salvarNovaMeta,
    );

    for (
        const radio of
        form.querySelectorAll(
            'input[name="modo_planejamento"]',
        )
    ) {
        radio.addEventListener(
            "change",
            atualizarVisualModoPlanejamento,
        );
    }

    for (
        const id of [
            "input-valor-alvo-meta",
            "input-prazo-meta",
            "input-valor-mensal-meta",
        ]
    ) {
        obterElemento(id).addEventListener(
            "input",
            atualizarPreviewPlanejamento,
        );
    }
}


function configurarFormularioAporte() {
    obterElemento(
        "form-aporte",
    ).addEventListener(
        "submit",
        salvarAporte,
    );
}


function configurarFiltrosDasMetas() {
    obterElemento(
        "filtro-busca-meta",
    ).addEventListener(
        "input",
        aplicarFiltrosDasMetas,
    );

    obterElemento(
        "filtro-status-meta",
    ).addEventListener(
        "change",
        aplicarFiltrosDasMetas,
    );
}


document.addEventListener(
    "DOMContentLoaded",
    () => {
        configurarModais();
        configurarFormularioMeta();
        configurarFormularioAporte();
        configurarFiltrosDasMetas();

        atualizarVisualModoPlanejamento();
        carregarMetas();
    },
);
