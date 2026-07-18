# Changelog

Todas as mudanças relevantes do FinDash são registradas neste arquivo.

## [1.0.0] — 2026-07-18

### Adicionado

- Dashboard com navegação mensal.
- Resumo de saldo, receitas e despesas.
- Gráfico de fluxo financeiro.
- Gráfico de alocação da renda.
- CRUD de movimentações.
- Histórico com busca e filtros.
- CRUD de categorias.
- CRUD completo de metas.
- Registro e acompanhamento de aportes.
- Filtros contextuais entre páginas.
- Dependências visuais locais.
- Documentação técnica da API, banco e regras.
- Roteiro de testes manuais.

### Alterado

- Fontes remotas substituídas por fontes do sistema.
- Font Awesome substituído por ícones SVG locais.
- Chart.js movido para a pasta de dependências locais.

### Regras de consistência

- Exclusão de meta preserva movimentações.
- Edição de meta recalcula o planejamento sobre o valor restante.
- Meses futuros permanecem bloqueados no Dashboard.
