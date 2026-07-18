from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, status

import bancodedados
from schemas import MetaCreate


router = APIRouter()


@router.post(
    "/metas",
    status_code=status.HTTP_201_CREATED,
)
def criar_meta(meta: MetaCreate):
    """
    Cria uma meta usando exatamente um modo de planejamento:

    - prazo_meses: o backend calcula o valor mensal;
    - valor_mensal: o backend calcula o prazo necessário.
    """
    nome = meta.nome.strip()
    alvo = float(meta.valor_alvo)

    prazo_informado = meta.prazo_meses is not None
    mensal_informado = meta.valor_mensal is not None

    if not nome:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Informe um nome para a meta.",
        )

    if alvo <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O valor-alvo deve ser maior que zero.",
        )

    if prazo_informado == mensal_informado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Informe apenas um modo de planejamento: "
                "prazo em meses OU valor mensal."
            ),
        )

    if prazo_informado:
        prazo = int(meta.prazo_meses)

        if prazo <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O prazo deve ser de pelo menos um mês.",
            )

        mensal = alvo / prazo
    else:
        mensal = float(meta.valor_mensal)

        if mensal <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O valor mensal deve ser maior que zero.",
            )

        prazo = math.ceil(alvo / mensal)

    # A última contribuição pode ser menor que as anteriores.
    ultima_parcela = alvo - (mensal * (prazo - 1))

    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO metas (
                nome,
                valor_alvo,
                prazo_meses,
                valor_mensal
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                nome,
                alvo,
                prazo,
                mensal,
            ),
        )

        conexao.commit()
        novo_id = cursor.lastrowid
    finally:
        cursor.close()
        conexao.close()

    return {
        "mensagem": "Meta criada com sucesso.",
        "id": novo_id,
        "nome": nome,
        "valor_alvo": round(alvo, 2),
        "prazo_meses": prazo,
        "valor_mensal_projetado": round(mensal, 2),
        "valor_ultima_parcela": round(ultima_parcela, 2),
    }


@router.get("/metas")
def listar_metas():
    """
    Lista as metas e soma os aportes registrados como despesas
    vinculadas pelo campo transacoes.meta_id.
    """
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT
                m.id,
                m.nome,
                m.valor_alvo,
                m.prazo_meses,
                m.valor_mensal,
                m.status,
                COALESCE(
                    SUM(
                        CASE
                            WHEN LOWER(t.tipo) = 'despesa'
                            THEN ABS(t.valor)
                            ELSE 0
                        END
                    ),
                    0
                ) AS valor_poupado
            FROM metas AS m
            LEFT JOIN transacoes AS t
                ON m.id = t.meta_id
            GROUP BY
                m.id,
                m.nome,
                m.valor_alvo,
                m.prazo_meses,
                m.valor_mensal,
                m.status
            ORDER BY
                CASE
                    WHEN COALESCE(
                        SUM(
                            CASE
                                WHEN LOWER(t.tipo) = 'despesa'
                                THEN ABS(t.valor)
                                ELSE 0
                            END
                        ),
                        0
                    ) >= m.valor_alvo
                    THEN 1
                    ELSE 0
                END,
                m.id DESC
            """
        )

        resultado = cursor.fetchall()
    finally:
        cursor.close()
        conexao.close()

    lista_metas = []

    for linha in resultado:
        alvo = float(linha["valor_alvo"])
        poupado = float(linha["valor_poupado"])
        restante = max(alvo - poupado, 0)

        porcentagem = (
            (poupado / alvo) * 100
            if alvo > 0
            else 0
        )

        concluida = alvo > 0 and poupado >= alvo

        lista_metas.append(
            {
                "id": linha["id"],
                "nome": linha["nome"],
                "valor_alvo": round(alvo, 2),
                "prazo_meses": linha["prazo_meses"],
                "valor_mensal_projetado": round(
                    float(linha["valor_mensal"] or 0),
                    2,
                ),
                "valor_poupado": round(poupado, 2),
                "valor_restante": round(restante, 2),
                "porcentagem_concluida": round(
                    porcentagem,
                    2,
                ),
                "status": (
                    "Concluída"
                    if concluida
                    else linha["status"]
                ),
            }
        )

    return {"metas": lista_metas}
