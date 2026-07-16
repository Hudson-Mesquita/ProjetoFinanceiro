from fastapi import APIRouter
import bancodedados

router = APIRouter()

@router.get("/dashboard/saldo")
def obter_saldo():
    conexao = bancodedados.criar_conexao()
    cursor =  conexao.cursor()

    #criar uma query do sql para fazer o cálculo do saldo
    query = '''SELECT
                    COALESCE (SUM(CASE WHEN tipo IN('receita', 'recebimento') THEN valor ELSE 0 END), 0) AS total_receitas,
                    COALESCE (SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS total_despesas
                FROM transacoes'''

    cursor.execute(query)
    resultado = cursor.fetchone()
    conexao.close()
    receitas = resultado['total_receitas']
    despesas = resultado['total_despesas']
    saldo = receitas - despesas

    return{
        'receitas': receitas,
        'despesas': despesas,
        'saldo': saldo
    }


@router.get("/dashboard/alertas")
def verificar_alertas():
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()


    #fazenbdo leftjoin para criar alertas, pega todas as categorias, e cruza apenas com transações de despesa
    query = ''' SELECT
                    c.nome,
                    c.limite,
                    COALESCE(SUM(t.valor), 0) AS total_gasto
                FROM categorias c
                LEFT JOIN transacoes t ON c.id = t.categoria_id AND t.tipo = 'despesa' 
                WHERE c.limite > 0
                GROUP BY c.id, c.nome, c.limite
                '''
    cursor.execute(query)
    linhas = cursor.fetchall()
    conexao.close()

    alertas = []

    for linha in linhas:
        nome = linha["nome"]
        limite = linha["limite"]
        gasto = linha['total_gasto']

        porcentagem = (gasto / limite) * 100

        if gasto > limite:
            status = 'Estourado'
            mensagem =  f'Você atingiu e/ou ultrapassou o limite em {nome}'

        elif porcentagem > 80:
            status = 'Aviso'
            mensagem = f'Cuidado!!, Você já consumiu {porcentagem:.1f}% do limite em {nome}'
        else:
            status = 'Certo'
            mensagem = f'Orçamento com {nome} em ordem'


        alertas.append({
            'categorias': nome,
            'limite': limite,
            'total_gasto': gasto,
            'porcentagem_gasto': round(porcentagem, 1),
            'status': status,
            'mensagem': mensagem

        })

    return {'Alertas': alertas}