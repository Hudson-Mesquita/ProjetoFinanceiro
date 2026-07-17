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
// Guarda o ID da transação atualmente sendo editada.
// null significa que o modal está no modo "Nova movimentação".
let transacaoEmEdicaoId = null;
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
 * Retorna a data local no formato YYYY-MM-DD.
 *
 * O input type="date" exige exatamente esse formato.
 * Não usamos diretamente new Date().toISOString(), porque
 * toISOString trabalha com UTC e pode avançar a data no Brasil.
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
            obterDataLocalISO();
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


async function carregarDashboard() {
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();
    const mesFormatado = String(mesAtual + 1).padStart(2, "0");

    obterElemento("titulo-mes").textContent =
        `${nomesMeses[mesAtual]} - ${anoAtual}`;

    try {
        const [dadosSaldo, dadosExtrato] = await Promise.all([
            buscarJson(
                `${API_URL}/dashboard/saldo?mes=${mesFormatado}&ano=${anoAtual}`,
            ),
            buscarJson(
                `${API_URL}/transacoes?mes=${mesFormatado}&ano=${anoAtual}`,
            ),
        ]);

        const historico = Array.isArray(dadosExtrato.historico)
            ? dadosExtrato.historico
            : [];

        atualizarResumo(dadosSaldo);
        renderizarTransacoes(historico);
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
    } catch (erro) {
        mostrarErroNoDashboard(erro);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    configurarPopovers();
    configurarModalTransacao();
    configurarGerenciadorCategorias();
    carregarCategoriasParaModal();
    carregarDashboard();

});
