"""
Equipes Coo — API Backend
FastAPI + SQLite
"""

import os
import json
import secrets
import sqlite3
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ── Config ──────────────────────────────────────────────────────────────────
APP_SENHA = os.getenv("APP_SENHA", "epcoo123")
DB_PATH   = os.path.join(os.path.dirname(__file__), "data.db")

# Tokens ativos em memória { token: True }
_tokens: set[str] = set()

# ── DB ───────────────────────────────────────────────────────────────────────
def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS store (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        # Garante que os registros existam com estado vazio
        for k, default in [
            ("banco", json.dumps({"lideres": [], "funcionarios": [], "atividades": [], "areas": []})),
            ("prog",  json.dumps({"semanaInicio": "", "dias": {}, "atualizadoEm": None})),
        ]:
            db.execute("INSERT OR IGNORE INTO store (key, value) VALUES (?, ?)", (k, default))
        db.commit()

def db_get(key: str):
    with get_db() as db:
        row = db.execute("SELECT value FROM store WHERE key = ?", (key,)).fetchone()
    return json.loads(row[0]) if row else None

def db_set(key: str, value):
    with get_db() as db:
        db.execute("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", (key, json.dumps(value)))
        db.commit()

# ── App ──────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Equipes Coo API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Nginx filtra; em prod pode restringir ao domínio
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# ── Auth ─────────────────────────────────────────────────────────────────────
bearer = HTTPBearer()

def verificar_token(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if creds.credentials not in _tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    return creds.credentials

# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginPayload(BaseModel):
    senha: str

class DataPayload(BaseModel):
    banco: dict
    prog: dict

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.post("/api/login")
def login(payload: LoginPayload):
    if payload.senha != APP_SENHA:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha incorreta")
    token = secrets.token_hex(32)
    _tokens.add(token)
    return {"token": token}

@app.get("/api/data")
def get_data(token: str = Depends(verificar_token)):
    return {
        "banco": db_get("banco"),
        "prog":  db_get("prog"),
    }

@app.patch("/api/data")
def save_data(payload: DataPayload, token: str = Depends(verificar_token)):
    db_set("banco", payload.banco)
    db_set("prog",  payload.prog)
    return {"ok": True}

@app.get("/api/health")
def health():
    return {"status": "ok"}
