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

function criarElementoTransacao(transacao) {
    const visual = obterVisualTransacao(transacao);

    const item = document.createElement("div");
    item.className = "transaction-item";

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
    informacoes.textContent = `${categoria} • ${formatarData(transacao.data)}`;

    detalhes.append(descricao, informacoes);
    ladoEsquerdo.append(caixaIcone, detalhes);

    const valor = document.createElement("div");
    valor.className = `transaction-value ${visual.classeValor}`;
    valor.textContent = `${visual.sinal} ${formatarMoeda(transacao.valor)}`;

    item.append(ladoEsquerdo, valor);
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

// --- NOVA LÓGICA DO MODAL DE TRANSAÇÕES ---

function configurarModalTransacao() {
    const modal = obterElemento("modal-transacao");
    const form = obterElemento("form-transacao");
    const btnNova = obterElemento("btn-nova-transacao");
    const btnFechar = obterElemento("btn-fechar-modal");
    const btnCancelar = obterElemento("btn-cancelar-modal");
    const btnSalvar = obterElemento("btn-salvar-transacao");

    // Funções de abrir e fechar com limpeza de estado
    const abrirModal = () => {
        form.reset(); // Limpa o form toda vez que abrir
        
        // Auto-preenche a data de hoje para facilitar a vida do usuário
        const hoje = new Date().toISOString().split('T')[0];
        obterElemento("input-data").value = hoje;
        
        modal.classList.remove("oculto");
    };

    const fecharModal = () => {
        modal.classList.add("oculto");
    };

    // Listeners de abertura/fechamento
    btnNova.addEventListener("click", abrirModal);
    btnFechar.addEventListener("click", fecharModal);
    btnCancelar.addEventListener("click", fecharModal);

    // Fecha se clicar fora da caixa do modal (no fundo escuro)
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) fecharModal();
    });

    // Lida com o envio dos dados para o Back-end
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault(); // Impede a página de recarregar
        
        // UX: Bloqueia o botão e muda o texto para mostrar que está pensando
        btnSalvar.disabled = true;
        const textoOriginal = btnSalvar.innerHTML;
        btnSalvar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';

        try {
            const formData = new FormData(form);
            
            // Construção minuciosa do JSON convertendo os tipos corretos para o Python
            const payload = {
                descricao: formData.get("descricao"),
                valor: normalizarNumero(formData.get("valor")),
                tipo: formData.get("tipo"),
                data: formData.get("data"),
                categoria_id: parseInt(formData.get("categoria_id"), 10),
                // Se o usuário deixou em branco, mandamos null em vez de "NaN" ou 0
                meta_id: formData.get("meta_id") ? parseInt(formData.get("meta_id"), 10) : null
            };

            // Reutilizando a sua arquitetura robusta de requisição
            await buscarJson(`${API_URL}/transacoes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            // Se deu sucesso: fecha o modal e manda recarregar os dados na tela!
            fecharModal();
            await carregarDashboard();

        } catch (erro) {
            console.error("Falha ao salvar transação:", erro);
            alert(`Erro ao salvar: ${erro.message}`); // Alerta simples por enquanto
        } finally {
            // Libera o botão de voltar ao normal independente de sucesso ou erro
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = textoOriginal;
        }
    });
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

// --- NOVA LÓGICA DE CATEGORIAS ---

async function carregarCategoriasParaModal() {
    const select = obterElemento("select-categoria");
    
    try {
        // Busca a lista de categorias do seu backend
        const dados = await buscarJson(`${API_URL}/categorias`);
        
        // Limpa o "Carregando..." e prepara para receber os dados
        select.replaceChildren();
        
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = "Selecione uma categoria...";
        select.appendChild(placeholder);

        // Verifica se a lista veio do Python (geralmente sob a chave "categorias")
        const listaCategorias = Array.isArray(dados.categorias) ? dados.categorias : dados;

        if (listaCategorias.length === 0) {
            placeholder.textContent = "Nenhuma categoria cadastrada";
            return;
        }

        // Injeta as categorias reais no menu
        const fragmento = document.createDocumentFragment();
        for (const cat of listaCategorias) {
            const opcao = document.createElement("option");
            opcao.value = cat.id; // O valor invisível que vai pro banco (Ex: 1)
            opcao.textContent = cat.nome; // O texto visível pro usuário (Ex: "Lazer")
            fragmento.appendChild(opcao);
        }
        
        select.appendChild(fragmento);

    } catch (erro) {
        console.error("Erro ao carregar categorias:", erro);
        select.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
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
