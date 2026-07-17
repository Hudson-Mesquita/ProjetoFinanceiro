from pydantic import BaseModel, Field
from typing import Optional, Literal
from decimal import Decimal


class CategoriaCreate(BaseModel):
    nome: str
    limite: Optional[float] = 0.0

class TransacaoCreate(BaseModel):
    descricao: str
    valor: Decimal = Field(gt=0)
    tipo: str
    data: str
    categoria_id: int
    meta_id: Optional[int] = None

class MetaCreate(BaseModel):
    nome: str
    valor_alvo: float
    prazo_meses: Optional[int] = None
    valor_mensal: Optional[float] = None
