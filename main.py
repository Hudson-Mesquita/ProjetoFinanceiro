from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from rotas import categorias, transacoes, dashboard, metas
from bancodedados import iniciar_banco

@asynccontextmanager
async def lifespan(app: FastAPI):
    iniciar_banco()
    yield


# Inicializa API
app = FastAPI(title="FinDash API", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
                   allow_origins=['*'],# na fase dev, liberamos para qualquer orrigem
                   allow_credentials=True,
                   allow_methods=['*'],# Libera todo o CRUD
                   allow_headers=['*']
                   ) 

# extensões (rotas) no aplicativo principal
app.include_router(categorias.router)
app.include_router(transacoes.router)
app.include_router(dashboard.router)
app.include_router(metas.router)

