from fastapi import APIRouter
import bancodedados
from schemas import MetaCreate
import math

router = APIRouter()

@router.post('/metas')
def criar_meta(meta: MetaCreate):
    alvo = meta.valor_alvo
    prazo = meta.prazo_meses
    mensal = meta.valor_mensal

    if not prazo and not mensal:
        return{"erro": "Para a simulação, defina o prazo em meses OU o valor mensal disposto a economizar"}

    if prazo and not mensal:
        mensal = alvo / prazo

    elif mensal and not prazo:
        # FUNÇÃO NOVA!!! ceil significa que o resultado da divisão é arredondada para cima, exemplo: se der 10.1 meses, virará 11 meses totais
        prazo = math.ceil(alvo / mensal)


    #calculo da ultima parcela, por padrão, o calculo da última parcela sera o valor igual a parcela normal
    ultima_parcela = mensal

    # se o total projetado passar do alvo, significa que a última parcela é "quebrada"
    if (mensal * prazo) > alvo:
        meses_cheios = prazo - 1
        ultima_parcela = alvo - (mensal * meses_cheios)


    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
    INSERT INTO metas (nome, valor_alvo, prazo_meses, valor_mensal) VALUES (?, ?, ?, ?)
    """, (meta.nome, alvo, prazo, mensal))

    conexao.commit()
    novo_id = cursor.lastrowid
    conexao.close()

    return {
        "mensagem": "Meta criada com sucesso",
        "id": novo_id,
        "nome": meta.nome,
        "valor_alvo": alvo,
        "prazo mensal": prazo,
        "valor_mensal_projetado": round(mensal,2),
        "valor_ultima_parcela": round(ultima_parcela, 2)

    }
@router.get('/metas')
def listar_meta():
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    #O SQL vai pegar a meta e somar todas as transações atreladas a ID dela
    query = """
                SELECT m.id, m.nome, m.valor_alvo, m.prazo_meses, m.valor_mensal, m.status,
                COALESCE(SUM(t.valor), 0) AS valor_poupado
                FROM metas AS m
                LEFT JOIN transacoes AS t ON m.id = t.meta_id
                GROUP BY m.id
                """
    cursor.execute(query)
    resultado = cursor.fetchall()
    conexao.close()

    lista_metas = []

    for linha in resultado:
        alvo = linha['valor_alvo']
        poupado = linha['valor_poupado']

        porcentagem = (poupado / alvo) * 100 if alvo > 0 else 0

        lista_metas.append({
            'id': linha['id'],
            'nome': linha['nome'],
            'valor_alvo': alvo,
            'prazo_meses': linha['prazo_meses'],
            'valor_mensal_projetado': round(linha['valor_mensal'], 2),
            'valor_poupado': round(poupado, 2),
            'porcentagem_concluida': round(porcentagem, 2),
            'status': linha['status'],
        })

    return {'metas': lista_metas}
