import sqlite3

#criando conexão com banco de dados, sqlite3 usado, pois é simples, fácil e prático, nesse caso;
#estou a pedir para conectar ao FinDash.DB, se ele não existir na máquina, fará a criação posterior

def criar_conexao():
    conexao = sqlite3.connect('FinDash.db')

    #eu quero retornar as informações desse banco de dados como um dicionário para consultas
    conexao.row_factory = sqlite3.Row
    return conexao


def iniciar_banco():
    conexao = criar_conexao()

    # o cursor é o mouse, ele pega a conexão e a partir dele podemos fazer as mudanças necessárias
    # dentro do banco de dados
    cursor = conexao.cursor()

#aqui é a criação da tabela, criando uma chave primária chamada ID, que vai somando, tendo um nome
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categorias(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            limite REAL DEFAULT 0
            )
    ''')


# mesma coisa que acima, porém Veja que a última linha faz a "amarracão" (FOREIGN KEY) avisando que o categoria_id tem que existir na tabela categorias.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transacoes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descricao TEXT NOT NULL,
            valor REAL NOT NULL,
            tipo TEXT NOT NULL,
            data DATE NOT NULL,
            categoria_id Integer,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            )
    ''')

    conexao.commit()
    conexao.close()


if __name__ == '__main__':
    iniciar_banco()
    print("Banco de dados FinDash criado com sucesso")
