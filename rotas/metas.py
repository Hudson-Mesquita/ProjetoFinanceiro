from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, status

import bancodedados
from schemas import MetaCreate


router = APIRouter()


def _validar_modo_planejamento(meta: MetaCreate) -> None:
    prazo_informado = meta.prazo_meses is not None
    mensal_informado = meta.valor_mensal is not None

    if prazo_informado == mensal_informado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Informe apenas um modo de planejamento: "
                "prazo em meses OU valor mensal."
            ),
        )


def _calcular_planejamento(
    meta: MetaCreate,
    valor_base: float,
) -> tuple[int, float, float]:
    """
    Calcula prazo, contribuição mensal e última contribuição.

    Em uma edição, valor_base é o valor que ainda falta depois
    de descontar os aportes já registrados.
    """
    _validar_modo_planejamento(meta)

    if valor_base <= 0:
        return 0, 0.0, 0.0

    if meta.prazo_meses is not None:
        prazo = int(meta.prazo_meses)

        if prazo <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O prazo deve ser de pelo menos um mês.",
            )

        mensal = valor_base / prazo
    else:
        mensal = float(meta.valor_mensal)

        if mensal <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="O valor mensal deve ser maior que zero.",
            )

        prazo = math.ceil(valor_base / mensal)

    ultima_parcela = valor_base - (mensal * (prazo - 1))

    return prazo, mensal, max(ultima_parcela, 0.0)


def _validar_dados_basicos(meta: MetaCreate) -> tuple[str, float]:
    nome = meta.nome.strip()
    alvo = float(meta.valor_alvo)

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

    return nome, alvo


@router.post(
    "/metas",
    status_code=status.HTTP_201_CREATED,
)
def criar_meta(meta: MetaCreate):
    nome, alvo = _validar_dados_basicos(meta)
    prazo, mensal, ultima_parcela = _calcular_planejamento(
        meta,
        alvo,
    )

    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO metas (
                nome,
                valor_alvo,
                prazo_meses,
                valor_mensal,
                status
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                nome,
                alvo,
                prazo,
                mensal,
                "Em andamento",
            ),
        )

        conexao.commit()
        novo_id = cursor.lastrowid
    except Exception:
        conexao.rollback()
        raise
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


@router.put("/metas/{meta_id}")
def atualizar_meta(
    meta_id: int,
    meta: MetaCreate,
):
    """
    Atualiza a meta sem alterar os aportes existentes.

    O novo planejamento é calculado apenas sobre o valor restante:
    novo valor-alvo - total já reservado.
    """
    nome, alvo = _validar_dados_basicos(meta)
    _validar_modo_planejamento(meta)

    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT id
            FROM metas
            WHERE id = ?
            """,
            (meta_id,),
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta não encontrada.",
            )

        cursor.execute(
            """
            SELECT COALESCE(
                SUM(
                    CASE
                        WHEN LOWER(tipo) = 'despesa'
                        THEN ABS(valor)
                        ELSE 0
                    END
                ),
                0
            ) AS valor_poupado
            FROM transacoes
            WHERE meta_id = ?
            """,
            (meta_id,),
        )

        linha_total = cursor.fetchone()
        poupado = float(linha_total["valor_poupado"] or 0)
        restante = max(alvo - poupado, 0)

        prazo, mensal, ultima_parcela = _calcular_planejamento(
            meta,
            restante,
        )

        novo_status = (
            "Concluída"
            if poupado >= alvo
            else "Em andamento"
        )

        cursor.execute(
            """
            UPDATE metas
            SET
                nome = ?,
                valor_alvo = ?,
                prazo_meses = ?,
                valor_mensal = ?,
                status = ?
            WHERE id = ?
            """,
            (
                nome,
                alvo,
                prazo,
                mensal,
                novo_status,
                meta_id,
            ),
        )

        conexao.commit()
    except HTTPException:
        conexao.rollback()
        raise
    except Exception:
        conexao.rollback()
        raise
    finally:
        cursor.close()
        conexao.close()

    resposta = {
        "mensagem": "Meta atualizada com sucesso.",
        "id": meta_id,
        "nome": nome,
        "valor_alvo": round(alvo, 2),
        "valor_poupado": round(poupado, 2),
        "valor_restante": round(restante, 2),
        "prazo_meses": prazo,
        "valor_mensal_projetado": round(mensal, 2),
        "valor_ultima_parcela": round(ultima_parcela, 2),
        "status": novo_status,
    }

    if poupado >= alvo:
        resposta["aviso"] = (
            "O valor já reservado alcança ou ultrapassa "
            "o novo valor-alvo; a meta foi marcada como concluída."
        )

    return resposta


@router.delete("/metas/{meta_id}")
def excluir_meta(meta_id: int):
    """
    Exclui a meta, mas preserva todas as movimentações financeiras.

    As transações vinculadas recebem meta_id = NULL antes da remoção.
    As duas operações pertencem à mesma transação do SQLite.
    """
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    try:
        cursor.execute(
            """
            SELECT nome
            FROM metas
            WHERE id = ?
            """,
            (meta_id,),
        )

        meta = cursor.fetchone()

        if meta is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta não encontrada.",
            )

        cursor.execute(
            """
            SELECT COUNT(*) AS quantidade
            FROM transacoes
            WHERE meta_id = ?
            """,
            (meta_id,),
        )

        quantidade_vinculada = int(
            cursor.fetchone()["quantidade"] or 0
        )

        cursor.execute(
            """
            UPDATE transacoes
            SET meta_id = NULL
            WHERE meta_id = ?
            """,
            (meta_id,),
        )

        cursor.execute(
            """
            DELETE FROM metas
            WHERE id = ?
            """,
            (meta_id,),
        )

        conexao.commit()
    except HTTPException:
        conexao.rollback()
        raise
    except Exception:
        conexao.rollback()
        raise
    finally:
        cursor.close()
        conexao.close()

    mensagem = "Meta excluída com sucesso."

    if quantidade_vinculada > 0:
        substantivo = (
            "movimentação"
            if quantidade_vinculada == 1
            else "movimentações"
        )

        verbo = (
            "foi preservada"
            if quantidade_vinculada == 1
            else "foram preservadas"
        )

        mensagem += (
            f" {quantidade_vinculada} {substantivo} "
            f"{verbo} no histórico e desvinculada"
            f"{'s' if quantidade_vinculada != 1 else ''} da meta."
        )

    return {
        "mensagem": mensagem,
        "id": meta_id,
        "movimentacoes_preservadas": quantidade_vinculada,
    }
