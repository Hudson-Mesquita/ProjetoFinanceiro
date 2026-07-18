// URL base da API FastAPI
const API_URL = window.FINDASH_API_URL ?? "http://127.0.0.1:8000";

// Armazena o banco de dados inteiro na memória do navegador para filtros instantâneos
let bancoDeTransacoes = [];

// =========================================================
// UTILITÁRIOS E FORMATAÇÃO
// =========================================================

function obterElemento(id) {
    const elemento = document.getElementById(id);
    if (!elemento) throw new Error(`Elemento HTML não encontrado: #${id}`);
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
    if (!data) return "Data não informada";
    const dataLocal = new Date(`${data}T00:00:00`);
    if (Number.isNaN(dataLocal.getTime())) return String(data);
    return new Intl.DateTimeFormat("pt-BR").format(dataLocal);
}

// =========================================================
// RENDERIZAÇÃO DA TABELA
// =========================================================

function obterBadgeTipo(transacao) {
    const tipo = String(transacao.tipo ?? "").toLowerCase();
    const ehReceita = tipo === "receita" || tipo === "recebimento";
    const ehMeta = normalizarNumero(transacao.meta_id) > 0;

    if (ehMeta) {
        return `<span class="badge-tipo meta">Reserva / Meta</span>`;
    }
    
    if (ehReceita) {
        return `<span class="badge-tipo receita">Receita</span>`;
    }

    return `<span class="badge-tipo despesa">Despesa</span>`;
}

function renderizarTabela(listaDeTransacoes) {
    const tbody = obterElemento("tabela-corpo");
    tbody.replaceChildren(); // Limpa a tabela atual

    if (listaDeTransacoes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state" style="text-align: center; padding: 40px;">
                    Nenhuma transação encontrada com os filtros atuais.
                </td>
            </tr>
        `;
        return;
    }

    const fragmento = document.createDocumentFragment();

    // Ordena da mais recente para a mais antiga antes de renderizar
    const transacoesOrdenadas = [...listaDeTransacoes].sort((a, b) => {
        return new Date(`${b.data}T00:00:00`).getTime() - new Date(`${a.data}T00:00:00`).getTime();
    });

    for (const transacao of transacoesOrdenadas) {
        const tr = document.createElement("tr");

        const ehReceita = transacao.tipo === "receita" || transacao.tipo === "recebimento";
        const sinal = ehReceita ? "+" : "-";
        const corValor = normalizarNumero(transacao.meta_id) > 0 ? "var(--cor-meta)" : (ehReceita ? "var(--cor-receita)" : "var(--cor-despesa)");

        tr.innerHTML = `
            <td style="color: var(--texto-secundario); font-weight: 500;">
                ${formatarData(transacao.data)}
            </td>
            <td style="font-weight: 500; color: var(--texto-principal);">
                ${transacao.descricao}
            </td>
            <td>
                ${transacao.categoria || "Sem categoria"}
            </td>
            <td>
                ${obterBadgeTipo(transacao)}
            </td>
            <td style="text-align: right; font-weight: 600; color: ${corValor};">
                ${sinal} ${formatarMoeda(transacao.valor)}
            </td>
            <td style="text-align: center;">
                <div class="transaction-actions" style="justify-content: center; gap: 16px; display: flex;">
                    <button class="btn-icon edit" onclick="editarTransacaoDaLista(${transacao.id})" title="Editar" style="border: none; background: transparent; cursor: pointer; color: var(--texto-secundario); font-size: 16px; transition: color 0.2s;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deletarTransacaoDaLista(${transacao.id}, '${transacao.descricao}')" title="Excluir" style="border: none; background: transparent; cursor: pointer; color: var(--texto-secundario); font-size: 16px; transition: color 0.2s;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        fragmento.appendChild(tr);
    }

    tbody.appendChild(fragmento);
}

// =========================================================
// LÓGICA DE FILTROS INSTANTÂNEOS
// =========================================================

function aplicarFiltros() {
    const buscaDescricao = obterElemento("filtro-busca").value.toLowerCase().trim();
    const filtroMes = obterElemento("filtro-mes").value;
    const filtroAno = obterElemento("filtro-ano").value;
    const filtroTipo = obterElemento("filtro-tipo").value;

    const listaFiltrada = bancoDeTransacoes.filter(transacao => {
        // Filtro de Busca por texto (Descrição ou Categoria)
        const descValida = transacao.descricao.toLowerCase().includes(buscaDescricao);
        const catValida = (transacao.categoria || "").toLowerCase().includes(buscaDescricao);
        const atendeBusca = descValida || catValida;

        // Extraindo mês e ano da data (Formato YYYY-MM-DD)
        const partesData = transacao.data ? transacao.data.split("-") : [];
        const anoTransacao = partesData[0] || "";
        const mesTransacao = partesData[1] || "";

        // Filtro de Mês e Ano
        const atendeMes = filtroMes === "" || mesTransacao === filtroMes;
        const atendeAno = filtroAno === "" || anoTransacao === filtroAno;

        // Filtro de Tipo (Receita, Despesa ou Meta)
        const tipoBase = String(transacao.tipo).toLowerCase();
        let atendeTipo = true;
        if (filtroTipo === "receita") {
            atendeTipo = tipoBase === "receita" || tipoBase === "recebimento";
        } else if (filtroTipo === "despesa") {
            atendeTipo = tipoBase === "despesa";
        }

        // Se atender a TODOS os filtros, a transação continua na lista
        return atendeBusca && atendeMes && atendeAno && atendeTipo;
    });

    renderizarTabela(listaFiltrada);
}

function configurarEventosDosFiltros() {
    const inputs = ["filtro-busca", "filtro-mes", "filtro-ano", "filtro-tipo"];
    
    inputs.forEach(id => {
        obterElemento(id).addEventListener("input", aplicarFiltros);
    });
}

// =========================================================
// INTEGRAÇÃO COM A API
// =========================================================

// =========================================================
// FILTROS DINÂMICOS
// =========================================================

function popularFiltroAnos(listaDeTransacoes) {
    const selectAno = obterElemento("filtro-ano");
    
    // Usamos um Set (Conjunto) para guardar os anos sem deixar repetir
    const anosUnicos = new Set();

    listaDeTransacoes.forEach(transacao => {
        if (transacao.data) {
            const ano = transacao.data.split("-")[0]; // Pega só o YYYY
            if (ano) anosUnicos.add(ano);
        }
    });

    // Transformamos o Set em Array e ordenamos do mais novo pro mais velho
    const anosOrdenados = Array.from(anosUnicos).sort((a, b) => b - a);

    // Começamos o HTML do select com a opção padrão
    let opcoesHTML = '<option value="">Todos os anos</option>';

    // Injetamos os anos encontrados no banco de dados
    anosOrdenados.forEach(ano => {
        opcoesHTML += `<option value="${ano}">${ano}</option>`;
    });

    selectAno.innerHTML = opcoesHTML;
}


async function carregarHistoricoCompleto() {
    try {
        // Chamamos a rota sem parâmetros para trazer TUDO o que existe no banco
        const resposta = await fetch(`${API_URL}/transacoes`);
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        
        bancoDeTransacoes = Array.isArray(dados.historico) ? dados.historico : [];
        
        // NOVO: Alimenta o filtro de anos baseado no banco de dados ANTES de renderizar
        popularFiltroAnos(bancoDeTransacoes);
        
        
        // Assim que chegar, aplicamos os filtros padrão (que estão vazios, logo, mostra tudo)
        aplicarFiltros();
        
    } catch (erro) {
        console.error("Falha ao buscar transações:", erro);
        obterElemento("tabela-corpo").innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--cor-despesa); padding: 40px;">
                    Erro ao conectar com o servidor.
                </td>
            </tr>
        `;
    }
}

// Ação de deletar conectada diretamente no botão da tabela
window.deletarTransacaoDaLista = async function(id, descricao) {
    if (!window.confirm(`Tem certeza que deseja apagar a transação "${descricao}"?`)) {
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/transacoes/${id}`, { method: "DELETE" });
        if (!resposta.ok) throw new Error("Falha ao apagar no servidor.");
        
        // Recarrega o banco de dados interno na mesma hora e limpa a tabela
        await carregarHistoricoCompleto();
        
    } catch (erro) {
        alert(erro.message);
    }
};
// Ação temporária para o botão Editar (Ainda vamos conectar o Modal aqui)
// =========================================================
// LÓGICA DO MODAL (CRIAR E EDITAR)
// =========================================================

let transacaoEmEdicaoId = null;

// Ferramenta auxiliar para buscar JSON
async function buscarJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
    try { return await resposta.json(); } catch { return {}; }
}

// Abre o modal. Se receber uma transação, entra em modo Edição. Se não, modo Criação.
window.editarTransacaoDaLista = async function(id) {
    const transacao = bancoDeTransacoes.find(t => t.id === id);
    if (transacao) await abrirModalTransacao(transacao);
};

obterElemento("btn-nova-transacao-lista").addEventListener("click", () => abrirModalTransacao(null));

async function abrirModalTransacao(transacao = null) {
    const modal = obterElemento("modal-transacao");
    const form = obterElemento("form-transacao");
    const tituloModal = modal.querySelector(".modal-header h2");
    const btnSalvar = obterElemento("btn-salvar-transacao");

    form.reset();
    await carregarCategoriasParaModal(transacao ? transacao.categoria_id : null);

    if (transacao) {
        transacaoEmEdicaoId = transacao.id;
        tituloModal.textContent = "Editar Movimentação";
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
        
        form.elements["descricao"].value = transacao.descricao ?? "";
        form.elements["valor"].value = transacao.valor ?? "";
        form.elements["tipo"].value = transacao.tipo ?? "despesa";
        form.elements["data"].value = transacao.data ?? "";
        form.elements["categoria_id"].value = transacao.categoria_id ?? "";
        form.elements["meta_id"].value = transacao.meta_id ?? "";
    } else {
        transacaoEmEdicaoId = null;
        tituloModal.textContent = "Registrar Movimentação";
        btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
        
        // Auto-preenche a data de hoje no formato YYYY-MM-DD
        const hoje = new Date();
        form.elements["data"].value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    }

    modal.classList.remove("oculto");
}

function fecharModalTransacao() {
    obterElemento("modal-transacao").classList.add("oculto");
    transacaoEmEdicaoId = null;
}

obterElemento("btn-fechar-modal").addEventListener("click", fecharModalTransacao);
obterElemento("btn-cancelar-modal").addEventListener("click", fecharModalTransacao);

// Salvar a transação (POST ou PUT)
obterElemento("form-transacao").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const btnSalvar = obterElemento("btn-salvar-transacao");
    const textoOriginal = btnSalvar.innerHTML;
    
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';

    try {
        const formData = new FormData(evento.target);
        const payload = {
            descricao: formData.get("descricao"),
            valor: normalizarNumero(formData.get("valor")),
            tipo: formData.get("tipo"),
            data: formData.get("data"),
            categoria_id: parseInt(formData.get("categoria_id"), 10),
            meta_id: formData.get("meta_id") ? parseInt(formData.get("meta_id"), 10) : null
        };

        const metodo = transacaoEmEdicaoId ? "PUT" : "POST";
        const endpoint = transacaoEmEdicaoId ? `${API_URL}/transacoes/${transacaoEmEdicaoId}` : `${API_URL}/transacoes`;

        await fetch(endpoint, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        fecharModalTransacao();
        
        // Magia: Recarrega a tabela e reconstrói os filtros instantaneamente
        await carregarHistoricoCompleto(); 
        
    } catch (erro) {
        alert(`Erro ao salvar: ${erro.message}`);
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = textoOriginal;
    }
});

// =========================================================
// CARREGAMENTO DE CATEGORIAS
// =========================================================
async function carregarCategoriasParaModal(categoriaSelecionadaId = null) {
    const select = obterElemento("select-categoria");
    try {
        const dados = await buscarJson(`${API_URL}/categorias`);
        const lista = Array.isArray(dados.categorias) ? dados.categorias : dados;
        
        let opcoesHTML = '<option value="" disabled>Selecione uma categoria...</option>';
        lista.forEach(cat => {
            const selecionado = Number(cat.id) === Number(categoriaSelecionadaId) ? "selected" : "";
            opcoesHTML += `<option value="${cat.id}" ${selecionado}>${cat.nome}</option>`;
        });
        select.innerHTML = opcoesHTML;
        if (!categoriaSelecionadaId) select.value = "";
    } catch (erro) {
        select.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
    }
}
// =========================================================
// GERENCIADOR DE CATEGORIAS
// =========================================================

function configurarGerenciadorCategorias() {
    const btnAbrir = obterElemento("btn-abrir-gerenciador-categorias");
    const modalCategorias = obterElemento("modal-categorias");
    const btnFechar = obterElemento("btn-fechar-categorias");
    const formNova = obterElemento("form-nova-categoria");
    const inputNova = obterElemento("input-nova-categoria");
    const listaGerenciador = obterElemento("lista-gerenciador-categorias");

    const abrirGerenciador = async (evento) => {
        evento.preventDefault();
        modalCategorias.classList.remove("oculto");
        await atualizarListaGerenciador();
    };

    const fecharGerenciador = () => {
        modalCategorias.classList.add("oculto");
        // Recarrega o menu suspenso de categorias no modal de transação
        carregarCategoriasParaModal(); 
    };

    btnAbrir.addEventListener("click", abrirGerenciador);
    btnFechar.addEventListener("click", fecharGerenciador);
    
    modalCategorias.addEventListener("click", (evento) => {
        if (evento.target === modalCategorias) fecharGerenciador();
    });

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
                
                const btnDeletar = document.createElement("button");
                btnDeletar.type = "button";
                btnDeletar.className = "btn-icon delete";
                btnDeletar.innerHTML = '<i class="fa-solid fa-trash"></i>';
                
                btnDeletar.onclick = () => deletarCategoria(cat.id, cat.nome);
                
                divAcoes.appendChild(btnDeletar);
                li.append(spanNome, divAcoes);
                fragmento.appendChild(li);
            }
            listaGerenciador.appendChild(fragmento);
        } catch (erro) {
            listaGerenciador.innerHTML = `<li style="color: var(--cor-despesa);">Erro ao carregar categorias</li>`;
        }
    }

    formNova.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nomeCategoria = inputNova.value.trim();
        if (!nomeCategoria) return;

        try {
            inputNova.disabled = true;
            await fetch(`${API_URL}/categorias`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: nomeCategoria }) 
            });
            inputNova.value = "";
            await atualizarListaGerenciador();
        } catch (erro) {
            alert(`Erro ao criar: ${erro.message}`);
        } finally {
            inputNova.disabled = false;
            inputNova.focus();
        }
    });

    async function deletarCategoria(id, nome) {
        if (!confirm(`Tem certeza que deseja apagar a categoria "${nome}"?`)) return;
        try {
            const resposta = await fetch(`${API_URL}/categorias/${id}`, { method: "DELETE" });
            if (!resposta.ok) {
                const erro = await resposta.json();
                throw new Error(erro.detail || "Erro ao deletar");
            }
            await atualizarListaGerenciador();
        } catch (erro) {
            alert(`Não foi possível deletar:\n${erro.message}`);
        }
    }
}
// =========================================================
// INICIALIZAÇÃO DA PÁGINA
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    configurarEventosDosFiltros();
    configurarGerenciadorCategorias();
    carregarHistoricoCompleto();
});