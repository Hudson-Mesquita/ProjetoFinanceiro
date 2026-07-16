from fastapi import APIRouter
import bancodedados
from schemas import TransacaoCreate

router = APIRouter()


@router.post("/transacoes")
def criar_transacao(transacao: TransacaoCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
    INSERT INTO transacoes (descricao, valor, tipo, data, categoria_id)
    VALUES (?, ?, ?, ?, ?)""", (transacao.descricao, transacao.valor, transacao.tipo, transacao.data, transacao.categoria_id))
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