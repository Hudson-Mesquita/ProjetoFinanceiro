from fastapi import APIRouter
import bancodedados
from schemas import TransacaoCreate
from typing import Optional

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
    return {
        'mensagem': 'transacao criada com sucesso',
        'id': novo_id,
        'valor': transacao.valor,
        'tipo': transacao.tipo,
        'data': transacao.data,
        'descricao': transacao.descricao,}


@router.get("/transacoes")
def listar_transacoes():
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    query = '''
        SELECT t.id, t.descricao, t.valor, t.tipo, t.data, c.nome
        FROM transacoes t
        JOIN categorias c ON t.categoria_id = c.id
    '''
    cursor.execute(query)
    linhas = cursor.fetchall()
    conexao.close()

    extrato = []
    for linha in linhas:
        # Como usei row_factory no bancodedados, as colunas podem ser acessadas pelo nome, pois são consideradas dicionários
        transacao_formatada = {
            "id": linha["id"],
            "descricao": linha["descricao"],
            "valor": linha["valor"],
            "tipo": linha["tipo"],
            "data": linha["data"],
            "categoria": linha["nome"]
        }
        extrato.append(transacao_formatada)

    return {"historico": extrato}


@router.put("/transacoes/{transacao_id}")
def atualizar_transacao(transacao_id: int, transacao: TransacaoCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    #atualiza apenas os campos da linha específica
    query = """
    UPDATE transacoes
    SET descricao = ?, valor = ?, tipo = ?, data = ?, categoria_id = ?
    where id = ?
    """

    cursor.execute(query, (
        transacao.descricao,
        transacao.valor,
        transacao.tipo,
        transacao.data,
        transacao.categoria_id,
        transacao_id
    ))

    conexao.commit()
    linhas_modificadas = cursor.rowcount
    conexao.close()

    if linhas_modificadas == 0:
        return {'error': 'Transação não encontrada.'}

    return {'msg': f"Transação {transacao_id} atualizada."}


@router.delete("/transacoes/{transacao_id}")
def deletar_transacao(transacao_id: int):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()


    #executa o comando de deleção do ID
    cursor.execute("""DELETE FROM transacoes WHERE id = ?""", (transacao_id,))
    conexao.commit()


    #mostrar linhas apagadas
    linhas_apagadas = cursor.rowcount
    conexao.close()

    if linhas_apagadas == 0:
        return {"error": 'nenhuma linha apagada/não encontrada'}
    return{"msg": f'transação {transacao_id} apagada.'}


@router.get("/transacoes")
def listar_transacoes(mes: Optional[str] = None, ano: Optional[str] = None):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    #inicio base query, uso o 1=1 para facilitar a adição de vários filtros dinâmicos com 'AND'
    query = """SELECT t.id, t.descricao, t.valor, t.tipo, t.data, c.nome
    FROM transacoes t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE 1=1"""

    parametros = []

    if mes and ano:
        query += f" AND t.ano = {ano}"
        #SQLite guarda a data em formato date, portanto, preciso colocar ano-mes-dia, o % significa qualquer dia,
        parametros.append(f"{ano}-{mes}-%")

    cursor.execute(query, parametros)
    linhas = cursor.fetchall()
    conexao.close()


    resultado = []
    for linha in linhas:
        transacao_formatada = {
            "id": linha["id"],
            "descricao": linha["descricao"],
            "valor": linha["valor"],
            "tipo": linha["tipo"],
            "data": linha["data"],
            "categoria": linha["nome"]
        }
        resultado.append(transacao_formatada)

    return {"historico": resultado}
