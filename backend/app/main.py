from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import engine
from backend.app.modules.trades.models import Base
from backend.app.modules.trades.routes import router as mvp_router
from backend.app.modules.screens.routes import router as screens_router

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="XVA Platform MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mvp_router)
app.include_router(screens_router)

@app.get("/")
def root():
    return {"status": "running"}