# API do FinDash

A API utiliza JSON e, durante o desenvolvimento, roda por padrão em:

```text
http://127.0.0.1:8000
```

A documentação interativa do FastAPI fica em `/docs`.

## Dashboard

### `GET /dashboard/saldo`

Parâmetros:

| Nome | Tipo | Exemplo |
|---|---|---|
| `mes` | string com dois dígitos | `07` |
| `ano` | string ou inteiro | `2026` |

Exemplo:

```http
GET /dashboard/saldo?mes=07&ano=2026
```

Resposta esperada:

```json
{
  "receitas": 3500.0,
  "despesas": 2100.0,
  "saldo": 1400.0
}
```

## Transações

### `GET /transacoes`

Lista todo o histórico. `mes` e `ano` podem ser utilizados em conjunto.

```http
GET /transacoes?mes=07&ano=2026
```

Resposta:

```json
{
  "historico": [
    {
      "id": 10,
      "descricao": "Salário",
      "valor": 3500.0,
      "tipo": "receita",
      "data": "2026-07-05",
      "categoria_id": 1,
      "categoria": "Trabalho",
      "meta_id": null
    }
  ]
}
```

### `POST /transacoes`

```json
{
  "descricao": "Mercado",
  "valor": 240.5,
  "tipo": "despesa",
  "data": "2026-07-10",
  "categoria_id": 2,
  "meta_id": null
}
```

Para um aporte:

```json
{
  "descricao": "Aporte - Notebook",
  "valor": 300.0,
  "tipo": "despesa",
  "data": "2026-07-10",
  "categoria_id": 5,
  "meta_id": 3
}
```

### `PUT /transacoes/{id}`

Recebe o mesmo formato do `POST` e substitui os campos editáveis da movimentação.

### `DELETE /transacoes/{id}`

Exclui a movimentação indicada. Deve retornar `404` quando o ID não existir.

## Categorias

### `GET /categorias`

```json
{
  "categorias": [
    {
      "id": 1,
      "nome": "Alimentação"
    }
  ]
}
```

### `POST /categorias`

```json
{
  "nome": "Transporte"
}
```

### `DELETE /categorias/{id}`

A exclusão pode ser recusada quando a categoria estiver vinculada a movimentações.

## Metas

### `GET /metas`

```json
{
  "metas": [
    {
      "id": 3,
      "nome": "Notebook",
      "valor_alvo": 5000.0,
      "prazo_meses": 10,
      "valor_mensal_projetado": 500.0,
      "valor_poupado": 1200.0,
      "valor_restante": 3800.0,
      "porcentagem_concluida": 24.0,
      "status": "Em andamento"
    }
  ]
}
```

### `POST /metas`

Somente um modo de planejamento deve ser informado.

Por prazo:

```json
{
  "nome": "Notebook",
  "valor_alvo": 5000.0,
  "prazo_meses": 10,
  "valor_mensal": null
}
```

Por contribuição mensal:

```json
{
  "nome": "Notebook",
  "valor_alvo": 5000.0,
  "prazo_meses": null,
  "valor_mensal": 500.0
}
```

### `PUT /metas/{id}`

Utiliza o mesmo payload do `POST`. O planejamento é recalculado com base no valor ainda não reservado.

### `DELETE /metas/{id}`

Exclui a meta, mas preserva as movimentações financeiras. Antes da exclusão, as transações associadas recebem `meta_id = NULL`.

## Códigos de resposta recomendados

| Código | Uso |
|---|---|
| `200` | leitura, atualização ou exclusão concluída |
| `201` | recurso criado |
| `400` | combinação inválida de parâmetros |
| `404` | recurso inexistente |
| `422` | dados inválidos |
| `500` | erro inesperado |
