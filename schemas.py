from pydantic import BaseModel
from typing import Optional
class CategoriaCreate(BaseModel):
    nome: str
    limite: Optional[float] = 0.0

class TransacaoCreate(BaseModel):
    descricao: str
    valor: float
    tipo: str
    data: str
    categoria_id: int
