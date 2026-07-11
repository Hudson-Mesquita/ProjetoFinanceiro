from fastapi import FastAPI
import sqlite3
import pydantic

app = FastAPI(title= "FinDash API")

#irei criar uma classe para definir o que o front end precisa enviar
class CategoriaCreate(pydantic.BaseModel):
    nome: str

# Este "decorador" avisa a API quando alguém acessar a URL
# Usando o método GET, eu executo a segunte função:

@app.get("/categorias")
def listar_categorias():
    conexao = sqlite3.connect("FinDash.db")
    cursor = conexao.cursor()
    cursor.execute("SELECT id, nome FROM categorias")
    resultado = cursor.fetchall()
    conexao.close()
    return {"resultado": resultado}
# irei usar app post e dizer que a função vai receber um dado que segue o molde da categoria

@app.post("/categorias")
def criar_categoria(categoria: CategoriaCreate):
    conexao = sqlite3.connect("FinDash.db")
    cursor = conexao.cursor()
    cursor.execute("INSERT INTO categorias (nome) VALUES(?)", (categoria.nome,)) #muito interessante, o simbolo ? é usado para evitar SQL Injection, no caso falha de segurança
    conexao.commit()
    novo_id = cursor.lastrowid # pega o ID automático que o SQLite acabou de gerar
    conexao.close()
    return {
        "mensagem": "Categoria criada com sucesso",
        "id": novo_id,
        "nome": categoria.nome
    }


# 1. O Molde da Transação
class TransacaoCreate(pydantic.BaseModel):
    descricao: str
    valor: float  # Usamos float para permitir casas decimais (ex: 150.50)
    tipo: str  # O ideal é receber "receita" ou "despesa"
    data: str  # Formato padrão de data: "YYYY-MM-DD"
    categoria_id: int  # O ID da categoria que você acabou de criar!


# 2. A Rota para inserir o dinheiro
@app.post("/transacoes")
def criar_transacao(transacao: TransacaoCreate):
    conexao = sqlite3.connect('FinDash.db')
    cursor = conexao.cursor()

    # Inserindo os 5 campos na tabela. Note que passamos os 5 pontos de interrogação.
    cursor.execute('''
        INSERT INTO transacoes (descricao, valor, tipo, data, categoria_id) 
        VALUES (?, ?, ?, ?, ?)
    ''', (transacao.descricao, transacao.valor, transacao.tipo, transacao.data, transacao.categoria_id))

    conexao.commit()
    novo_id = cursor.lastrowid
    conexao.close()

    return {
        "mensagem": "Transação registrada com sucesso!",
        "id": novo_id,
        "descricao": transacao.descricao,
        "valor": transacao.valor
    }


# 3. A Rota GET para o Histórico Completo
@app.get("/transacoes")
def listar_transacoes():
    conexao = sqlite3.connect('findash.db')
    cursor = conexao.cursor()

    # O velho conhecido join
    # Apelidamos transacoes de 't' e categorias de 'c' para facilitar.
    query = '''
        SELECT t.id, t.descricao, t.valor, t.tipo, t.data, c.nome
        FROM transacoes t
        JOIN categorias c ON t.categoria_id = c.id
    '''
    cursor.execute(query)
    linhas = cursor.fetchall()
    conexao.close()

    # Formatando a saída: transformando a "lista de tuplas" do banco em uma lista de dicionários
    extrato = []
    for linha in linhas:
        transacao_formatada = {
            "id": linha[0],
            "descricao": linha[1],
            "valor": linha[2],
            "tipo": linha[3],
            "data": linha[4],
            "categoria": linha[5]  # Aqui vem o NOME da categoria graças ao JOIN
        }
        extrato.append(transacao_formatada)

    return {"historico": extrato}