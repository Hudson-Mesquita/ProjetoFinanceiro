from fastapi import APIRouter
import bancodedados
from schemas import CategoriaCreate

#criando a extensão
router = APIRouter()

@router.get('/categorias')
def listar_categorias():
    conexao =bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute('SELECT ID, nome FROM categorias')
    resultado = cursor.fetchall()
    conexao.close()
    return {'categorias': resultado}


@router.post("/categorias")
def criar_categoria(categoria: CategoriaCreate):
    conexao = bancodedados.criar_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
    INSERT INTO categorias (nome) VALUES (?)""", (categoria.nome,))
    conexao.commit()

    novo_id = cursor.lastrowid
    cursor.close()

    return {
        'mensagem': 'categoria criada com sucesso',
        'id': novo_id,
        'nome': categoria.nome,}


