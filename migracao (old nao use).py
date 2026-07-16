import sqlite3

conexao = sqlite3.connect('Findash.db')

cursor = conexao.cursor()

try:
    cursor.execute('''ALTER TABLE categorias ADD COLUMN limite REAL DEFAULT 0''')
    conexao.commit()
    print('Migração realizada, adicionado coluna limite')
except sqlite3.OperationalError as e:
    print(f'Warn: {e}')

conexao.close()
