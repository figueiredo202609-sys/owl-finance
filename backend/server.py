from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
import os
import logging
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
import bcrypt as _bcrypt
import base64
import io
import json
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'owl-finance-secret-key-2026')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PLANS = [
    {"name": "Básico", "price": 69.90, "ocr": False, "history_days": 30, "export": False, "ai": False},
    {"name": "Profissional", "price": 94.90, "ocr": True, "history_days": 90, "export": True, "ai": False},
    {"name": "Premium", "price": 119.90, "ocr": True, "history_days": None, "export": True, "ai": True},
]


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_plan_info(plan_name: str):
    return next((p for p in PLANS if p["name"] == plan_name), PLANS[0])


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Conta desativada")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user


async def require_client(user=Depends(get_current_user)):
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user


# ---- Plans ----
@api_router.get("/plans")
async def get_plans():
    return PLANS


# ---- Auth ----
class LoginRequest(BaseModel):
    email: str
    password: str


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Conta desativada")
    token = create_token({"sub": str(user["_id"]), "role": user["role"]})
    return {
        "token": token,
        "role": user["role"],
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
            "restaurant_name": user.get("restaurant_name"),
            "plan_name": user.get("plan_name"),
            "status": user.get("status"),
        },
    }


@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "restaurant_name": user.get("restaurant_name"),
        "plan_name": user.get("plan_name"),
        "status": user.get("status"),
    }


# ---- Admin ----
class CreateClientRequest(BaseModel):
    email: str
    password: str
    restaurant_name: str
    plan_name: str = "Básico"


class UpdateClientRequest(BaseModel):
    email: Optional[str] = None
    restaurant_name: Optional[str] = None
    plan_name: Optional[str] = None
    password: Optional[str] = None


@api_router.get("/admin/clients")
async def get_clients(admin=Depends(require_admin)):
    clients = await db.users.find({"role": "client"}).to_list(1000)
    return [
        {
            "id": str(c["_id"]),
            "email": c["email"],
            "restaurant_name": c.get("restaurant_name", ""),
            "plan_name": c.get("plan_name", "Básico"),
            "status": c.get("status", "active"),
            "created_at": c.get("created_at", ""),
        }
        for c in clients
    ]


@api_router.post("/admin/create-client", status_code=201)
async def create_client(req: CreateClientRequest, admin=Depends(require_admin)):
    if await db.users.find_one({"email": req.email.lower().strip()}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    doc = {
        "email": req.email.lower().strip(),
        "password_hash": hash_password(req.password),
        "role": "client",
        "restaurant_name": req.restaurant_name,
        "plan_name": req.plan_name,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Cliente criado com sucesso"}


@api_router.put("/admin/clients/{client_id}")
async def update_client(client_id: str, req: UpdateClientRequest, admin=Depends(require_admin)):
    update = {}
    if req.email:
        update["email"] = req.email.lower().strip()
    if req.restaurant_name:
        update["restaurant_name"] = req.restaurant_name
    if req.plan_name:
        update["plan_name"] = req.plan_name
    if req.password:
        update["password_hash"] = hash_password(req.password)
    if update:
        await db.users.update_one({"_id": ObjectId(client_id)}, {"$set": update})
    return {"message": "Cliente atualizado"}


@api_router.delete("/admin/clients/{client_id}")
async def delete_client(client_id: str, admin=Depends(require_admin)):
    await db.users.delete_one({"_id": ObjectId(client_id)})
    await db.transactions.delete_many({"client_id": client_id})
    return {"message": "Cliente removido"}


@api_router.put("/admin/clients/{client_id}/toggle-status")
async def toggle_status(client_id: str, admin=Depends(require_admin)):
    user = await db.users.find_one({"_id": ObjectId(client_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    new_status = "inactive" if user.get("status") == "active" else "active"
    await db.users.update_one({"_id": ObjectId(client_id)}, {"$set": {"status": new_status}})
    return {"status": new_status}


@api_router.get("/admin/stats")
async def get_admin_stats(admin=Depends(require_admin)):
    all_clients = await db.users.find({"role": "client"}).to_list(1000)
    active = [c for c in all_clients if c.get("status") == "active"]
    plan_prices = {p["name"]: p["price"] for p in PLANS}
    monthly_revenue = sum(plan_prices.get(c.get("plan_name", "Básico"), 69.90) for c in active)

    plan_dist = {"Básico": 0, "Profissional": 0, "Premium": 0}
    for c in all_clients:
        plan = c.get("plan_name", "Básico")
        plan_dist[plan] = plan_dist.get(plan, 0) + 1

    recent_txs = await db.transactions.find().sort("created_at", -1).limit(10).to_list(10)
    txs_list = []
    for tx in recent_txs:
        c = await db.users.find_one({"_id": ObjectId(tx["client_id"])}) if tx.get("client_id") else None
        txs_list.append({
            "id": str(tx["_id"]),
            "type": tx["type"],
            "value": tx["value"],
            "name": tx.get("name", ""),
            "date": tx.get("date", ""),
            "restaurant_name": c.get("restaurant_name", "N/A") if c else "N/A",
        })

    base = datetime.now(timezone.utc)
    revenue_trend = []
    for i in range(5, -1, -1):
        d = base - timedelta(days=i * 30)
        revenue_trend.append({
            "month": d.strftime("%b/%y"),
            "receita": round(monthly_revenue * (0.65 + i * 0.07), 2),
        })

    return {
        "total_clients": len(all_clients),
        "active_clients": len(active),
        "inactive_clients": len(all_clients) - len(active),
        "monthly_revenue": round(monthly_revenue, 2),
        "plan_distribution": [{"name": k, "value": v} for k, v in plan_dist.items()],
        "revenue_trend": revenue_trend,
        "recent_transactions": txs_list,
    }


@api_router.get("/admin/all-transactions")
async def get_all_transactions(admin=Depends(require_admin)):
    txs = await db.transactions.find().sort("created_at", -1).to_list(500)
    result = []
    for tx in txs:
        c = await db.users.find_one({"_id": ObjectId(tx["client_id"])}) if tx.get("client_id") else None
        result.append({
            "id": str(tx["_id"]),
            "client_id": tx.get("client_id", ""),
            "type": tx["type"],
            "value": tx["value"],
            "date": tx.get("date", ""),
            "name": tx.get("name", ""),
            "description": tx.get("description", ""),
            "file_url": tx.get("file_url"),
            "created_at": tx.get("created_at", ""),
            "restaurant_name": c.get("restaurant_name", "N/A") if c else "N/A",
        })
    return result


# ---- Client ----
class TransactionCreate(BaseModel):
    type: str
    value: float
    date: str
    name: str
    description: Optional[str] = ""
    file_url: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    value: Optional[float] = None
    date: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


@api_router.get("/client/dashboard")
async def client_dashboard(user=Depends(require_client)):
    client_id = str(user["_id"])
    plan = user.get("plan_name", "Básico")
    plan_info = get_plan_info(plan)

    query = {"client_id": client_id}
    if plan_info["history_days"]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=plan_info["history_days"])).strftime("%Y-%m-%d")
        query["date"] = {"$gte": cutoff}

    txs = await db.transactions.find(query).to_list(2000)
    profits = sum(t["value"] for t in txs if t["type"] == "profit")
    expenses = sum(t["value"] for t in txs if t["type"] == "expense")

    monthly = {}
    for t in txs:
        try:
            m = t["date"][:7]
            if m not in monthly:
                monthly[m] = {"lucros": 0, "despesas": 0}
            if t["type"] == "profit":
                monthly[m]["lucros"] += t["value"]
            else:
                monthly[m]["despesas"] += t["value"]
        except Exception:
            pass

    chart_data = sorted(
        [{"month": k, "lucros": round(v["lucros"], 2), "despesas": round(v["despesas"], 2)} for k, v in monthly.items()],
        key=lambda x: x["month"],
    )[-6:]

    return {
        "profits": round(profits, 2),
        "expenses": round(expenses, 2),
        "balance": round(profits - expenses, 2),
        "chart_data": chart_data,
        "plan": plan,
        "plan_info": plan_info,
    }


@api_router.get("/client/transactions")
async def get_transactions(
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user=Depends(require_client),
):
    client_id = str(user["_id"])
    plan_info = get_plan_info(user.get("plan_name", "Básico"))

    query = {"client_id": client_id}
    date_filter = {}
    if plan_info["history_days"]:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=plan_info["history_days"])).strftime("%Y-%m-%d")
        date_filter["$gte"] = cutoff
    if start_date:
        if "$gte" in date_filter:
            date_filter["$gte"] = max(date_filter["$gte"], start_date)
        else:
            date_filter["$gte"] = start_date
    if end_date:
        date_filter["$lte"] = end_date
    if date_filter:
        query["date"] = date_filter
    if type:
        query["type"] = type

    txs = await db.transactions.find(query).sort("date", -1).to_list(1000)
    return [
        {
            "id": str(t["_id"]),
            "client_id": t["client_id"],
            "type": t["type"],
            "value": t["value"],
            "date": t.get("date", ""),
            "name": t.get("name", ""),
            "description": t.get("description", ""),
            "file_url": t.get("file_url"),
            "created_at": t.get("created_at", ""),
        }
        for t in txs
    ]


@api_router.post("/client/transactions", status_code=201)
async def create_transaction(req: TransactionCreate, user=Depends(require_client)):
    doc = {
        "client_id": str(user["_id"]),
        "type": req.type,
        "value": req.value,
        "date": req.date,
        "name": req.name,
        "description": req.description or "",
        "file_url": req.file_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.transactions.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Transação criada"}


@api_router.put("/client/transactions/{tx_id}")
async def update_transaction(tx_id: str, req: TransactionUpdate, user=Depends(require_client)):
    tx = await db.transactions.find_one({"_id": ObjectId(tx_id), "client_id": str(user["_id"])})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.transactions.update_one({"_id": ObjectId(tx_id)}, {"$set": update})
    return {"message": "Transação atualizada"}


@api_router.delete("/client/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user=Depends(require_client)):
    result = await db.transactions.delete_one({"_id": ObjectId(tx_id), "client_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Transação removida"}


@api_router.post("/client/ocr")
async def process_ocr(file: UploadFile = File(...), user=Depends(require_client)):
    plan_info = get_plan_info(user.get("plan_name", "Básico"))
    if not plan_info["ocr"]:
        raise HTTPException(
            status_code=403,
            detail="OCR não disponível no plano Básico. Faça upgrade para usar esta funcionalidade."
        )

    content = await file.read()
    filename = (file.filename or "").lower()
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Chave LLM não configurada")

    prompt_json = (
        "Analise este comprovante/nota fiscal e extraia as informações financeiras. "
        "Retorne APENAS um JSON válido (sem markdown, sem explicações) com este formato:\n"
        '{"valor": <número decimal>, "data": "<YYYY-MM-DD>", "nome": "<nome ou descrição>"}\n'
        "Se não encontrar algum campo, use null."
    )

    try:
        if filename.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = " ".join(page.extract_text() or "" for page in pdf.pages)
            chat = LlmChat(
                api_key=llm_key,
                session_id=str(uuid.uuid4()),
                system_message="Você extrai dados financeiros de comprovantes."
            ).with_model("openai", "gpt-4o")
            msg = UserMessage(text=f"Texto do comprovante:\n{text[:3000]}\n\n{prompt_json}")
            response = await chat.send_message(msg)
        else:
            img_b64 = base64.b64encode(content).decode()
            chat = LlmChat(
                api_key=llm_key,
                session_id=str(uuid.uuid4()),
                system_message="Você extrai dados financeiros de comprovantes."
            ).with_model("openai", "gpt-4o")
            msg = UserMessage(text=prompt_json, file_contents=[ImageContent(image_base64=img_b64)])
            response = await chat.send_message(msg)

        try:
            data = json.loads(response)
        except Exception:
            match = re.search(r'\{[^{}]+\}', response, re.DOTALL)
            data = json.loads(match.group()) if match else {}

        return {"valor": data.get("valor"), "data": data.get("data"), "nome": data.get("nome")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar OCR: {str(e)}")


@api_router.get("/client/profile")
async def get_profile(user=Depends(require_client)):
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "restaurant_name": user.get("restaurant_name", ""),
        "plan_name": user.get("plan_name", "Básico"),
        "status": user.get("status", "active"),
        "created_at": user.get("created_at", ""),
    }


class ProfileUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


@api_router.put("/client/profile")
async def update_profile(req: ProfileUpdate, user=Depends(require_client)):
    update = {}
    if req.restaurant_name:
        update["restaurant_name"] = req.restaurant_name
    if req.email:
        update["email"] = req.email.lower().strip()
    if req.password:
        update["password_hash"] = hash_password(req.password)
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    return {"message": "Perfil atualizado"}


# ---- AI Insights (Premium only) ----
class AiInsightsRequest(BaseModel):
    question: str


@api_router.post("/client/ai-insights")
async def ai_insights(req: AiInsightsRequest, user=Depends(require_client)):
    if user.get("plan_name") != "Premium":
        raise HTTPException(status_code=403, detail="IA disponível apenas no plano Premium")

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(status_code=500, detail="Chave LLM não configurada")

    client_id = str(user["_id"])
    txs = await db.transactions.find({"client_id": client_id}).sort("date", -1).to_list(500)

    profits = [t for t in txs if t["type"] == "profit"]
    expenses = [t for t in txs if t["type"] == "expense"]
    total_profit = sum(t["value"] for t in profits)
    total_expense = sum(t["value"] for t in expenses)

    monthly: dict = {}
    for t in txs:
        try:
            m = t["date"][:7]
            if m not in monthly:
                monthly[m] = {"lucros": 0, "despesas": 0}
            if t["type"] == "profit":
                monthly[m]["lucros"] += t["value"]
            else:
                monthly[m]["despesas"] += t["value"]
        except Exception:
            pass

    tx_list = [
        {
            "tipo": "Lucro" if t["type"] == "profit" else "Despesa",
            "valor": t["value"],
            "data": t.get("date", ""),
            "nome": t.get("name", ""),
            "descricao": t.get("description", ""),
        }
        for t in txs[:200]
    ]

    system_msg = (
        f"Você é um consultor financeiro especializado em restaurantes. "
        f"Analise os dados do restaurante \"{user.get('restaurant_name', 'N/A')}\" e responda em português brasileiro.\n\n"
        f"RESUMO FINANCEIRO:\n"
        f"- Total Lucros: R$ {total_profit:.2f}\n"
        f"- Total Despesas: R$ {total_expense:.2f}\n"
        f"- Saldo: R$ {total_profit - total_expense:.2f}\n"
        f"- Total transações: {len(txs)}\n\n"
        f"RESUMO MENSAL: {json.dumps(monthly, ensure_ascii=False)}\n\n"
        f"TRANSAÇÕES DETALHADAS: {json.dumps(tx_list, ensure_ascii=False)}\n\n"
        f"Responda de forma clara, objetiva e profissional. Use os dados reais para embasar as respostas. "
        f"Formate valores monetários em Real (R$). Use listas quando necessário para clareza."
    )

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=str(uuid.uuid4()),
            system_message=system_msg,
        ).with_model("openai", "gpt-4o")
        response = await chat.send_message(UserMessage(text=req.question))
        return {"response": response}
    except Exception as e:
        logger.error(f"AI Insights error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar IA: {str(e)}")


# ---- App ----
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    if not await db.users.find_one({"role": "admin"}):
        await db.users.insert_one({
            "email": "figueiredo202609@gmail.com",
            "password_hash": hash_password("Aires100686"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin criado")

    if not await db.users.find_one({"email": "owltest@test.com"}):
        res = await db.users.insert_one({
            "email": "owltest@test.com",
            "password_hash": hash_password("Client123!"),
            "role": "client",
            "restaurant_name": "Restaurante Teste",
            "plan_name": "Profissional",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        cid = str(res.inserted_id)
        sample = [
            {"client_id": cid, "type": "profit", "value": 3500.00, "date": "2026-01-15", "name": "Vendas Almoço", "description": "Receitas do almoço", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "profit", "value": 2800.00, "date": "2026-01-22", "name": "Vendas Jantar", "description": "Receitas do jantar", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "expense", "value": 1200.00, "date": "2026-01-10", "name": "Insumos Cozinha", "description": "Fornecedor XYZ", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "expense", "value": 800.00, "date": "2026-01-28", "name": "Aluguel", "description": "Aluguel do mês", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "profit", "value": 4200.00, "date": "2026-02-05", "name": "Evento Corporativo", "description": "Reserva especial", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "expense", "value": 950.00, "date": "2026-02-10", "name": "Folha Salarial", "description": "Salários equipe", "created_at": datetime.now(timezone.utc).isoformat()},
            {"client_id": cid, "type": "profit", "value": 1800.00, "date": "2026-02-18", "name": "Delivery", "description": "Pedidos online", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.transactions.insert_many(sample)
        logger.info("Cliente de teste criado")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
