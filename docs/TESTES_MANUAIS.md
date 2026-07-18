# Testes manuais da V1.0

Execute os testes com um banco de demonstração ou com um backup disponível.

## 1. Inicialização limpa

- [ ] Remover ou renomear temporariamente `FinDash.db`.
- [ ] Iniciar a API.
- [ ] Confirmar que o banco é criado.
- [ ] Abrir as três páginas sem erros no console.
- [ ] Confirmar os estados vazios.

## 2. Categorias

- [ ] Criar uma categoria.
- [ ] Confirmar que ela aparece no formulário.
- [ ] Excluir uma categoria sem movimentações.
- [ ] Tentar excluir uma categoria em uso.
- [ ] Confirmar mensagem de erro adequada.

## 3. Transações

- [ ] Criar receita.
- [ ] Criar despesa.
- [ ] Editar descrição, valor, data, tipo e categoria.
- [ ] Excluir movimentação.
- [ ] Confirmar retorno `404` para ID inexistente.
- [ ] Testar descrição com caracteres especiais.
- [ ] Testar valor decimal.

## 4. Dashboard

- [ ] Confirmar saldo, receitas e despesas.
- [ ] Navegar para o mês anterior.
- [ ] Voltar ao mês atual.
- [ ] Confirmar bloqueio da seta para mês futuro.
- [ ] Abrir o histórico de despesas.
- [ ] Abrir o histórico de receitas.
- [ ] Confirmar mês, ano e tipo já selecionados.
- [ ] Testar período sem dados.

## 5. Gráficos

- [ ] Confirmar gráfico de fluxo.
- [ ] Confirmar gráfico de alocação.
- [ ] Testar mês sem receitas.
- [ ] Testar mês sem despesas.
- [ ] Testar despesas acima das receitas.
- [ ] Redimensionar a janela.

## 6. Metas

- [ ] Criar meta por prazo.
- [ ] Criar meta por valor mensal.
- [ ] Editar nome e alvo.
- [ ] Alternar modo de planejamento.
- [ ] Registrar aporte.
- [ ] Confirmar progresso.
- [ ] Abrir movimentações da meta.
- [ ] Limpar filtro de meta.
- [ ] Concluir uma meta.
- [ ] Excluir meta.
- [ ] Confirmar que os aportes permanecem no histórico.

## 7. Funcionamento offline

- [ ] Desconectar a internet.
- [ ] Recarregar Dashboard, Transações e Metas.
- [ ] Confirmar tipografia.
- [ ] Confirmar ícones.
- [ ] Confirmar gráficos.
- [ ] Verificar que não há falhas de CDN no console.

## 8. Repositório

- [ ] Confirmar ausência de `.idea/`.
- [ ] Confirmar ausência de `FinDash.db`.
- [ ] Confirmar ausência de `__pycache__/`.
- [ ] Executar `python scripts/verificar_v1.py`.
- [ ] Criar tag `v1.0.0`.
