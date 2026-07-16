from fastapi import FastAPI
from rotas import categorias, transacoes

# Inicializa API
app = FastAPI(title="FinDash API")

# extensões (rotas) no aplicativo principal
app.include_router(categorias.router)
app.include_router(transacoes.router)
