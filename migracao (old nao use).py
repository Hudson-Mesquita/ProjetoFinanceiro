import sqlite3

conexao = sqlite3.connect('FinDash.db')
cursor = conexao.cursor()

try:
    # 1. Cria a tabela de metas (O Planejamento)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor_alvo REAL NOT NULL,
            prazo_meses INTEGER,
            valor_mensal REAL,
            status TEXT DEFAULT 'Em andamento'
        )
    ''')

    # 2. Adiciona a coluna meta_id na tabela de transações (A Execução)
    # Coloca DEFAULT NULL para não quebrar as transações antigas
    cursor.execute("ALTER TABLE transacoes ADD COLUMN meta_id INTEGER DEFAULT NULL REFERENCES metas(id)")

    conexao.commit()
    print("Migração de Metas concluída com sucesso!")
except sqlite3.OperationalError as e:
    print(f"Aviso na migração: {e}")

conexao.close()
