// URL base da API FastAPI
const API_URL = 'http://127.0.0.1:8000';

const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

async function carregarDashboard() {
    try {
        const dataAtual = new Date();
        const mesAtual = dataAtual.getMonth(); 
        const anoAtual = dataAtual.getFullYear();
        const mesFormatado = String(mesAtual + 1).padStart(2, '0'); 

        document.getElementById('titulo-mes').textContent = `${nomesMeses[mesAtual]} - ${anoAtual}`;

        // BUSCANDO SALDO
        const resposta = await fetch(`${API_URL}/dashboard/saldo?mes=${mesFormatado}&ano=${anoAtual}`);
        const dados = await resposta.json();

        const receitas = dados.receitas || 0;
        const despesas = dados.despesas || 0;
        const saldo = dados.saldo_total !== undefined ? dados.saldo_total : (receitas - despesas);

        const elementoSaldo = document.getElementById('valor-saldo');
        elementoSaldo.textContent = formatarMoeda(saldo);

        if (saldo < 0) {
            elementoSaldo.style.color = 'var(--cor-despesa)';
        } else {
            elementoSaldo.style.color = 'var(--texto-principal)';
        }

        document.getElementById('valor-receitas').textContent = formatarMoeda(receitas);
        document.getElementById('valor-despesas').textContent = formatarMoeda(despesas);

        // BUSCANDO EXTRATO E METAS
        const respostaExtrato = await fetch(`${API_URL}/transacoes?mes=${mesFormatado}&ano=${anoAtual}`);
        const dadosExtrato = await respostaExtrato.json();
        
        const listaTransacoes = document.getElementById('lista-transacoes');
        listaTransacoes.innerHTML = '';
        const historico = dadosExtrato.historico;

        if (historico.length === 0) {
            listaTransacoes.innerHTML = '<div class="empty-state"><p>Nenhuma movimentação registrada neste mês.</p></div>';
        } else {
            const ultimasTransacoes = historico.slice(-5).reverse();

            ultimasTransacoes.forEach(transacao => {
                const ehReceita = transacao.tipo === 'receita' || transacao.tipo === 'recebimento';
                
                // BLINDAGEM DA META: Garante que é um número válido e maior que zero
                const ehMeta = Boolean(transacao.meta_id) && transacao.meta_id > 0;

                let classeIcone = ehReceita ? 'receita' : 'despesa';
                let iconeFa = ehReceita ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                let classeValor = ehReceita ? 'positivo' : 'negativo';
                let sinal = ehReceita ? '+' : '-';

                // Se for meta, aplica o amarelo!
                if (ehMeta) {
                    classeIcone = 'meta';
                    iconeFa = 'fa-piggy-bank'; 
                    classeValor = 'neutro'; 
                }

                const linhaHTML = `
                    <div class="transaction-item">
                        <div class="transaction-left">
                            <div class="transaction-icon ${classeIcone}">
                                <i class="fa-solid ${iconeFa}"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${transacao.descricao}</h4>
                                <p>${transacao.categoria} • ${transacao.data}</p>
                            </div>
                        </div>
                        <div class="transaction-value ${classeValor}">
                            ${sinal} ${formatarMoeda(transacao.valor)}
                        </div>
                    </div>
                `;
                
                listaTransacoes.innerHTML += linhaHTML;
            });
        }

        // --- LÓGICA DOS MENUS SUSPENSOS (POPOVERS) ---
        const btnDespesas = document.getElementById('btn-despesas');
        const popoverDespesas = document.getElementById('popover-despesas');
        const listaMiniDespesas = document.getElementById('lista-mini-despesas');

        const btnReceitas = document.getElementById('btn-receitas');
        const popoverReceitas = document.getElementById('popover-receitas');
        const listaMiniReceitas = document.getElementById('lista-mini-receitas');

        function preencherMiniLista(listaElemento, transacoes, tipoFiltrado) {
            listaElemento.innerHTML = '';
            
            const filtradas = transacoes.filter(t => {
                if (tipoFiltrado === 'receita') return t.tipo === 'receita' || t.tipo === 'recebimento';
                return t.tipo === 'despesa';
            }).slice(-3).reverse();

            if (filtradas.length === 0) {
                listaElemento.innerHTML = '<li><span style="color: var(--texto-secundario)">Nenhuma registrada</span></li>';
                return;
            }

            filtradas.forEach(t => {
                listaElemento.innerHTML += `
                    <li>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${t.descricao}</span>
                        <span style="font-weight: 600">${formatarMoeda(t.valor)}</span>
                    </li>
                `;
            });
        }

        preencherMiniLista(listaMiniDespesas, historico, 'despesa');
        preencherMiniLista(listaMiniReceitas, historico, 'receita');

        // CLICÁVEIS!
        btnDespesas.addEventListener('click', (evento) => {
            evento.stopPropagation(); 
            popoverDespesas.classList.toggle('oculto');
            popoverReceitas.classList.add('oculto'); 
        });

        btnReceitas.addEventListener('click', (evento) => {
            evento.stopPropagation();
            popoverReceitas.classList.toggle('oculto');
            popoverDespesas.classList.add('oculto');
        });

        document.addEventListener('click', () => {
            popoverDespesas.classList.add('oculto');
            popoverReceitas.classList.add('oculto');
        });
        
        popoverDespesas.addEventListener('click', (evento) => evento.stopPropagation());
        popoverReceitas.addEventListener('click', (evento) => evento.stopPropagation());

    } catch (erro) {
        console.error("Erro ao buscar dados do servidor:", erro);
    }
}

document.addEventListener('DOMContentLoaded', carregarDashboard);