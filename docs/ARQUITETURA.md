# Arquitetura

## Visão geral

O FinDash usa uma arquitetura simples em três camadas:

```text
Frontend estático
      │
      │ fetch / JSON
      ▼
API FastAPI
      │
      │ sqlite3
      ▼
Banco SQLite
```

## Frontend

O frontend é escrito em HTML, CSS e JavaScript puro.

Cada tela possui seu próprio arquivo principal:

| Tela | HTML | JavaScript |
|---|---|---|
| Dashboard | `index.html` | `app.js` |
| Transações | `transacoes.html` | `transacoes.js` |
| Metas | `metas.html` | `metas.js` |

O `style.css` é compartilhado pelas três telas.

## Recursos locais

A pasta `frontend/assets/` contém tudo o que antes dependeria da internet:

```text
assets/
├── css/icons.css
├── js/icons.js
└── vendor/
    ├── chart.umd.min.js
    └── Chart.js-LICENSE.md
```

`icons.js` observa o DOM e transforma as classes `fa-*` existentes em SVGs locais. Isso permitiu remover a dependência do Font Awesome sem reescrever todos os botões e componentes.

## Backend

O `main.py` cria a aplicação FastAPI, inicializa o banco e registra os roteadores.

Os recursos ficam separados por domínio:

```text
rotas/
├── categorias.py
├── dashboard.py
├── metas.py
└── transacoes.py
```

## Fluxo de uma operação

Exemplo de criação de uma despesa:

1. o usuário envia o formulário;
2. o JavaScript valida e cria o payload;
3. `fetch()` chama `POST /transacoes`;
4. o FastAPI valida o payload com Pydantic;
5. a rota executa um `INSERT` parametrizado;
6. a API devolve JSON;
7. o frontend recarrega o período atual.

## Decisões da V1.0

- sem framework frontend;
- sem etapa de build;
- banco local;
- API e frontend separados durante o desenvolvimento;
- dependências visuais distribuídas localmente;
- operações críticas protegidas por confirmação;
- exclusão de meta preserva o histórico financeiro.
