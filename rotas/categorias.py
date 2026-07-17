from fastapi import APIRouter, HTTPException
import bancodedados
from schemas import CategoriaCreate

#criando a extensão
router = APIRouter()

@router.get('/categorias')
def listar_categorias():
    conexao =bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute('SELECT id, nome FROM categorias')
    resultado = cursor.fetchall()
    conexao.close()
    categorias_formatadas = []
    for linha in resultado:
        categorias_formatadas.append({
            "id": linha["id"],  # Se faltar isso, o Front-end fica cego
            "nome": linha["nome"]
        })

    return {"categorias": categorias_formatadas}


@router.post("/categorias")
def criar_categoria(categoria: CategoriaCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
    INSERT INTO categorias (nome, limite) VALUES (?, ?)""", (categoria.nome, categoria.limite))
    conexao.commit()

    novo_id = cursor.lastrowid
    cursor.close()
    conexao.close()

    return {
        'mensagem': 'categoria criada com sucesso',
        'id': novo_id,
        'nome': categoria.nome,
        'limite': categoria.limite
        }


@router.delete('/categorias/{categoria_id}')
def deletar_categoria(categoria_id: int):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    # 1. Verifica existência
    cursor.execute("SELECT id, nome FROM categorias WHERE id = ?", (categoria_id,))
    categoria_existe = cursor.fetchone()

    if not categoria_existe:
        conexao.close()
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    # 2. Verifica vínculo com transações
    cursor.execute("SELECT COUNT(*) as total from transacoes WHERE categoria_id = ?", (categoria_id,))
    resultado = cursor.fetchone()

    if resultado and resultado["total"] > 0:
        conexao.close()
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível apagar: existem {resultado['total']} movimentações utilizando essa categoria"
        )

    # 3. Executa a exclusão
    cursor.execute("DELETE FROM categorias WHERE id = ?", (categoria_id,))
    linhas_apagadas = cursor.rowcount
    conexao.commit()
    conexao.close()

    # --- AQUI ESTÁ A MUDANÇA IMPORTANTE ---
    if linhas_apagadas == 0:
        # Se chegou aqui e não apagou nada, houve erro de integridade ou travamento
        raise HTTPException(status_code=500, detail="Falha ao deletar no banco de dados.")

    return {
        'mensagem': f'Categoria {categoria_id} removida com sucesso'
    }
