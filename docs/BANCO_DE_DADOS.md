# Banco de dados

O FinDash utiliza SQLite e cria o arquivo `FinDash.db` localmente.

## Tabelas principais

### `categorias`

| Coluna | Finalidade |
|---|---|
| `id` | chave primária |
| `nome` | nome exibido no frontend |

### `metas`

| Coluna | Finalidade |
|---|---|
| `id` | chave primária |
| `nome` | identificação do objetivo |
| `valor_alvo` | total pretendido |
| `prazo_meses` | prazo projetado |
| `valor_mensal` | contribuição mensal projetada |
| `status` | andamento ou conclusão |

### `transacoes`

| Coluna | Finalidade |
|---|---|
| `id` | chave primária |
| `descricao` | texto da movimentação |
| `valor` | valor monetário |
| `tipo` | receita, recebimento ou despesa |
| `data` | data no formato `YYYY-MM-DD` |
| `categoria_id` | vínculo com categoria |
| `meta_id` | vínculo opcional com meta |

## Relacionamentos

```text
categorias 1 ─────── N transacoes
metas      1 ─────── N transacoes
```

Uma movimentação pode não possuir meta. Quando uma meta é excluída, o `meta_id` das movimentações associadas é definido como `NULL`.

## Integridade

Recomendações mantidas pela aplicação:

- ativar `PRAGMA foreign_keys = ON` em cada conexão;
- usar parâmetros `?` nas consultas;
- executar operações relacionadas na mesma transação;
- aplicar rollback quando uma etapa falhar;
- não versionar o arquivo `.db`.

## Aportes

Um aporte não é armazenado em uma tabela separada. Ele é uma movimentação com:

```text
tipo = "despesa"
meta_id = ID da meta
```

A soma dessas movimentações representa o valor poupado da meta.

## Backup

Com a aplicação fechada, uma cópia do arquivo `FinDash.db` funciona como backup simples da V1.0.

Antes de restaurar:

1. encerre a API;
2. faça uma cópia do banco atual;
3. substitua o arquivo;
4. reinicie a aplicação.
