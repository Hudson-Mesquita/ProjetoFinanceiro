# FinDash

Aplicação de organização financeira pessoal desenvolvida com Python, FastAPI, SQLite, HTML, CSS e JavaScript.

> **Status:** projeto em desenvolvimento. O repositório ainda não representa a versão `1.0` e algumas funcionalidades do backend ainda estão sendo integradas à interface.

## Objetivo

O FinDash foi criado para centralizar transações, categorias, limites de gastos e metas financeiras em uma aplicação simples para uso local. O projeto também serve como estudo prático de:

- modelagem de banco de dados;
- desenvolvimento de API REST;
- regras de negócio financeiras;
- integração entre backend e frontend;
- empacotamento futuro como aplicação desktop.

## Funcionalidades atuais

### Backend

- cadastro e listagem de categorias;
- CRUD de transações;
- filtro de transações por mês e ano;
- cálculo de receitas, despesas e saldo;
- alertas de limite por categoria;
- cadastro e acompanhamento de metas;
- cálculo de prazo ou valor mensal de uma meta;
- criação automática do banco SQLite.

### Frontend

- dashboard mensal;
- exibição de saldo, receitas e despesas;
- listagem das movimentações mais recentes;
- menus com as últimas receitas e despesas;
- identificação visual de aportes ligados a metas.

## Em desenvolvimento

- CRUD completo de transações pela interface;
- telas de categorias e metas;
- gráficos e análises financeiras;
- validações adicionais;
- testes automatizados;
- empacotamento como aplicação executável;
- documentação da versão `1.0`.

## Tecnologias

- Python
- FastAPI
- SQLite
- Pydantic
- HTML
- CSS
- JavaScript

## Estrutura atual

```text
ProjetoFinanceiro/
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── rotas/
│   ├── categorias.py
│   ├── dashboard.py
│   ├── metas.py
│   └── transacoes.py
├── bancodedados.py
├── main.py
├── schemas.py
└── requirements.txt
```

## Execução local

### 1. Criar e ativar um ambiente virtual

Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Instalar as dependências

```bash
pip install -r requirements.txt
```

### 3. Iniciar a API

```bash
uvicorn main:app --reload
```

A documentação interativa ficará disponível em:

```text
http://127.0.0.1:8000/docs
```

### 4. Servir o frontend

Em outro terminal:

```bash
python -m http.server 5500 --directory frontend
```

Depois, acesse:

```text
http://127.0.0.1:5500
```

## Observações

- O banco `FinDash.db` é criado localmente.
- O arquivo do banco não deve ser versionado.
- Os dados usados durante o desenvolvimento devem ser fictícios.
- As instruções e funcionalidades serão revisadas para o lançamento da versão `1.0`.
