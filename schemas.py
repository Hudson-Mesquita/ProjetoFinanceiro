from pydantic import BaseModel

class CategoriaCreate(BaseModel):
    nome: str

class TransacaoCreate(BaseModel):
    descricao: str
    valor: float
    tipo: str
    data: str
    categoria_id: int
