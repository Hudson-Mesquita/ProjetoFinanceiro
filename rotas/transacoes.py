from fastapi import APIRouter
import bancodedados
from schemas import TransacaoCreate
from typing import Optional
from fastapi import HTTPException

router = APIRouter()


@router.post("/transacoes")
def criar_transacao(transacao: TransacaoCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
    INSERT INTO transacoes (descricao, valor, tipo, data, categoria_id, meta_id)
    VALUES (?, ?, ?, ?, ?, ?)""", (transacao.descricao, transacao.valor, transacao.tipo, transacao.data, transacao.categoria_id, transacao.meta_id))
    conexao.commit()
    novo_id = cursor.lastrowid
    cursor.close()
    conexao.close()

    return {
        'mensagem': 'transacao criada com sucesso',
        'id': novo_id,
        'valor': transacao.valor,
        'tipo': transacao.tipo,
        'data': transacao.data,
        'descricao': transacao.descricao,
    }


# Juntamos as duas funções em uma só, limpa e funcional
@router.get("/transacoes")
def listar_transacoes(
    mes: Optional[str] = None,
    ano: Optional[str] = None
):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    # LEFT JOIN mantém a transação no resultado mesmo que ela
    # não possua uma categoria associada.
    query = """
        SELECT
            t.id,
            t.descricao,
            t.valor,
            t.tipo,
            t.data,
            t.categoria_id,
            c.nome AS categoria_nome,
            t.meta_id
        FROM transacoes t
        LEFT JOIN categorias c
            ON t.categoria_id = c.id
        WHERE 1 = 1
    """

    parametros = []

    # Adiciona o filtro somente quando mês e ano forem enviados.
    if mes and ano:
        query += " AND t.data LIKE ?"
        parametros.append(f"{ano}-{mes}-%")

    # Deve ficar FORA do if.
    # Assim, a ordenação também funciona quando a rota é chamada
    # sem mês e ano.
    query += " ORDER BY t.data DESC, t.id DESC"

    cursor.execute(query, parametros)
    linhas = cursor.fetchall()

    cursor.close()
    conexao.close()

    resultado = []

    for linha in linhas:
        transacao_formatada = {
            "id": linha["id"],
            "descricao": linha["descricao"],
            "valor": linha["valor"],
            "tipo": linha["tipo"],
            "data": linha["data"],

            # O frontend precisa do ID para deixar a categoria
            # correta selecionada ao abrir o modo de edição.
            "categoria_id": linha["categoria_id"],

            # Nome usado apenas para exibição.
            "categoria": linha["categoria_nome"] or "Reserva/Meta",

            "meta_id": linha["meta_id"],
        }

        resultado.append(transacao_formatada)

    return {"historico": resultado}

@router.put("/transacoes/{transacao_id}")
def atualizar_transacao(transacao_id: int, transacao: TransacaoCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    # Atualiza a linha específica, agora incluindo o meta_id também
    query = """
    UPDATE transacoes
    SET descricao = ?, valor = ?, tipo = ?, data = ?, categoria_id = ?, meta_id = ?
    WHERE id = ?
    """

    cursor.execute(query, (
        transacao.descricao,
        transacao.valor,
        transacao.tipo,
        transacao.data,
        transacao.categoria_id,
        transacao.meta_id,
        transacao_id
    ))

    conexao.commit()
    linhas_modificadas = cursor.rowcount
    conexao.close()

    if linhas_modificadas == 0:
        raise HTTPException(status_code=404, detail= 'Transação não encontrada.' )

    return {'msg': f"Transação {transacao_id} atualizada."}


@router.delete("/transacoes/{transacao_id}")
def deletar_transacao(transacao_id: int):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    # Executa o comando de deleção do ID
    cursor.execute("""DELETE FROM transacoes WHERE id = ?""", (transacao_id,))
    conexao.commit()

    # Mostrar linhas apagadas
    linhas_apagadas = cursor.rowcount
    conexao.close()

    if linhas_apagadas == 0:
        raise HTTPException(
            status_code=404,
            detail="Transação não encontrada.",
        )
    return {"msg": f'transação {transacao_id} apagada.'}