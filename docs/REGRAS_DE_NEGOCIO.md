# Regras de negócio

## Tipos de movimentação

- `receita`: entrada financeira;
- `recebimento`: tratado como sinônimo de receita;
- `despesa`: saída financeira.

O saldo do período é:

```text
receitas - despesas
```

## Período do Dashboard

- o Dashboard abre no mês vigente;
- meses anteriores podem ser consultados pelas setas;
- meses futuros são bloqueados;
- saldo, listas, links e gráficos usam o mesmo período selecionado.

## Histórico contextual

Ao abrir o histórico pelo Dashboard, a URL recebe os filtros de tipo, mês e ano.

Ao abrir o histórico por uma meta, a URL recebe `meta_id` e `meta_nome`.

## Categorias

- cada movimentação deve possuir uma categoria válida;
- a categoria aparece pelo nome no frontend;
- o ID é mantido para permitir edição;
- categorias em uso não devem ser excluídas silenciosamente.

## Metas

Uma meta possui:

- nome;
- valor-alvo;
- prazo ou contribuição mensal;
- valor poupado calculado pelos aportes;
- valor restante;
- percentual de conclusão.

Somente um modo de planejamento é permitido por vez:

```text
prazo_meses OU valor_mensal
```

## Aportes

- aporte é uma despesa;
- aporte possui `meta_id`;
- aporte reduz o saldo disponível do mês;
- aporte aumenta o valor poupado da meta;
- o valor não deve ultrapassar o restante da meta.

## Edição de meta

Ao editar uma meta:

1. os aportes existentes são preservados;
2. o valor já poupado é calculado;
3. o novo planejamento usa somente o valor restante;
4. a meta é concluída quando o poupado alcança o novo alvo.

## Exclusão de meta

Excluir uma meta não pode apagar o histórico.

A operação correta é:

```sql
UPDATE transacoes
SET meta_id = NULL
WHERE meta_id = ?;

DELETE FROM metas
WHERE id = ?;
```

As duas instruções devem compartilhar o mesmo commit.

## Gráfico de fluxo

- receitas aparecem como entradas;
- despesas aparecem como saídas;
- o resultado acumulado acompanha o saldo ao longo do mês.

## Gráfico de alocação

- a soma das receitas forma a base;
- despesas são agrupadas por categoria;
- aportes vinculados a metas aparecem como alocação;
- a parte não utilizada aparece como “Não alocado”;
- quando as saídas ultrapassam as receitas, a interface deve sinalizar o excesso.
