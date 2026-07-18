# FinDash

Aplicação local de organização financeira pessoal desenvolvida com **FastAPI, SQLite, HTML, CSS e JavaScript puro**.

O FinDash reúne um dashboard mensal, histórico completo de movimentações, categorias e metas financeiras em uma interface única. Os dados permanecem armazenados localmente no arquivo SQLite da aplicação.

> **Versão:** `1.0.0`  
> **Status:** núcleo funcional concluído para uso e apresentação em portfólio.

## Funcionalidades

### Dashboard

- saldo, receitas e despesas do período selecionado;
- navegação entre meses anteriores;
- últimas movimentações;
- atalhos para históricos de receitas e despesas com filtros já aplicados;
- gráfico de fluxo financeiro por dia;
- gráfico de alocação da renda;
- criação e edição de movimentações;
- gerenciamento de categorias.

### Transações

- histórico completo;
- busca por descrição ou categoria;
- filtros por mês, ano e tipo;
- criação, edição e exclusão;
- abertura contextual a partir do Dashboard;
- filtro por meta financeira;
- preservação dos filtros após alterações.

### Metas

- criação por prazo ou por contribuição mensal;
- edição e exclusão;
- acompanhamento do valor-alvo, valor reservado e restante;
- percentual de conclusão;
- registro de aportes;
- visualização das movimentações vinculadas;
- conclusão automática ao atingir o objetivo;
- preservação das movimentações quando uma meta é excluída.

## Frontend offline

O frontend não depende de CDN para funcionar:

- a tipografia utiliza fontes já instaladas no sistema operacional;
- os ícones são renderizados por um pequeno módulo SVG local;
- o Chart.js está incluído em `frontend/assets/vendor/`;
- nenhuma página depende de Google Fonts, Font Awesome ou jsDelivr durante a execução.

Isso prepara o projeto para funcionamento sem internet e para um futuro empacotamento como aplicação desktop.

## Tecnologias

### Backend

- Python 3.10+
- FastAPI
- Pydantic
- SQLite
- Uvicorn

### Frontend

- HTML5
- CSS3
- JavaScript
- Canvas
- Chart.js 4.5.1 distribuído localmente

## Arquitetura

```text
Navegador
   │
   │ HTTP / JSON
   ▼
FastAPI
   │
   │ SQL parametrizado
   ▼
SQLite — FinDash.db
```

O frontend é servido separadamente durante o desenvolvimento. A API fornece os dados em JSON e o JavaScript atualiza a interface sem frameworks.

## Estrutura recomendada

```text
ProjetoFinanceiro/
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   └── icons.css
│   │   ├── js/
│   │   │   └── icons.js
│   │   └── vendor/
│   │       ├── chart.umd.min.js
│   │       └── Chart.js-LICENSE.md
│   ├── app.js
│   ├── index.html
│   ├── metas.html
│   ├── metas.js
│   ├── style.css
│   ├── transacoes.html
│   └── transacoes.js
├── rotas/
│   ├── categorias.py
│   ├── dashboard.py
│   ├── metas.py
│   └── transacoes.py
├── docs/
│   ├── API.md
│   ├── ARQUITETURA.md
│   ├── BANCO_DE_DADOS.md
│   ├── REGRAS_DE_NEGOCIO.md
│   └── TESTES_MANUAIS.md
├── scripts/
│   ├── iniciar_dev.bat
│   ├── iniciar_dev.sh
│   └── verificar_v1.py
├── bancodedados.py
├── main.py
├── schemas.py
├── CHANGELOG.md
├── requirements.txt
└── README.md
```

## Como executar

### 1. Criar o ambiente virtual

Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Linux ou macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Instalar as dependências

```bash
python -m pip install -r requirements.txt
```

### 3. Iniciar a API

```bash
python -m uvicorn main:app --reload
```

A documentação automática da API ficará disponível em:

```text
http://127.0.0.1:8000/docs
```

### 4. Iniciar o frontend

Em outro terminal:

```bash
python -m http.server 5500 --directory frontend
```

Abra:

```text
http://127.0.0.1:5500
```

O frontend não deve ser aberto diretamente por `file://`, pois a aplicação depende de requisições HTTP para a API.

### Inicialização rápida no Windows

```powershell
scripts\iniciar_dev.bat
```

## Endpoints principais

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/dashboard/saldo` | Resumo mensal |
| `GET` | `/transacoes` | Histórico, com filtros opcionais |
| `POST` | `/transacoes` | Criar movimentação |
| `PUT` | `/transacoes/{id}` | Editar movimentação |
| `DELETE` | `/transacoes/{id}` | Excluir movimentação |
| `GET` | `/categorias` | Listar categorias |
| `POST` | `/categorias` | Criar categoria |
| `DELETE` | `/categorias/{id}` | Excluir categoria |
| `GET` | `/metas` | Listar metas e progresso |
| `POST` | `/metas` | Criar meta |
| `PUT` | `/metas/{id}` | Editar meta |
| `DELETE` | `/metas/{id}` | Excluir meta |

Consulte os exemplos completos em [`docs/API.md`](docs/API.md).

## Regras importantes

- `receita` e `recebimento` são tratados como entrada;
- `despesa` é tratada como saída;
- um aporte é uma despesa vinculada a uma meta por `meta_id`;
- excluir uma meta não apaga suas movimentações;
- ao excluir uma meta, as movimentações são preservadas e apenas desvinculadas;
- o planejamento de uma meta editada considera o valor ainda restante;
- meses futuros permanecem bloqueados no Dashboard;
- a categoria de uma movimentação é mantida por chave estrangeira.

As regras completas estão em [`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md).

## Validação da versão

Execute:

```bash
python scripts/verificar_v1.py
```

O verificador confere:

- arquivos obrigatórios;
- referências externas no frontend;
- presença do Chart.js local;
- sintaxe dos JavaScripts quando o Node.js está disponível;
- compilação dos arquivos Python existentes.

O roteiro funcional completo está em [`docs/TESTES_MANUAIS.md`](docs/TESTES_MANUAIS.md).

## Banco de dados

O arquivo `FinDash.db` é criado localmente na primeira execução. Ele não deve ser enviado ao repositório, pois pode conter dados pessoais ou dados de teste específicos da máquina.

A modelagem está documentada em [`docs/BANCO_DE_DADOS.md`](docs/BANCO_DE_DADOS.md).

## Próximos passos após a V1.0

- testes automatizados de API;
- exportação para CSV;
- empacotamento como executável;
- instalador para Windows;
- backup e restauração do banco;
- melhorias de acessibilidade e responsividade;
- migrações versionadas do banco.

## Autor

Desenvolvido por **Hudson Mesquita** como projeto pessoal e de portfólio.

Repositório: `Hudson-Mesquita/ProjetoFinanceiro`
