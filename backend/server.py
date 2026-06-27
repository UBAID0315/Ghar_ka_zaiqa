from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import jwt
import bcrypt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', '').strip()
db_name = os.environ.get('DB_NAME', 'gharkazaiqa')

if not mongo_url or mongo_url.startswith('mock://'):
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
    db = client[db_name]
    logger = logging.getLogger(__name__)
    logger.info("Using mocked MongoDB database (in-memory)")
else:
    import urllib.parse
    try:
        p = urllib.parse.urlparse(mongo_url)
        if '@' in p.netloc:
            creds, host = p.netloc.rsplit('@', 1)
            if ':' in creds:
                user, pwd = creds.split(':', 1)
                new_netloc = f"{urllib.parse.quote_plus(user)}:{urllib.parse.quote_plus(pwd)}@{host}"
                p = p._replace(netloc=new_netloc)
                mongo_url = p.geturl()
    except Exception:
        pass
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
ORDER_STATUSES = ["new", "preparing", "out_for_delivery", "delivered", "cancelled"]


# ===================== AUTH HELPERS =====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "fallback_secret_jwt_key_2026")


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        try:
            user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===================== MODELS =====================
class LoginInput(BaseModel):
    email: str
    password: str

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = ""
    address: Optional[str] = ""

class MenuItem(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    price: int
    category: str
    available: bool = True
    img: Optional[str] = ""

class OrderItem(BaseModel):
    name: str
    price: int
    qty: int


class OrderCreate(BaseModel):
    order_type: Literal["cart", "booking"] = "cart"
    customer_name: str
    phone: str
    area: str
    address: Optional[str] = ""
    note: Optional[str] = ""
    items: List[OrderItem] = []
    week_choice: Optional[str] = ""
    meals: Optional[str] = ""
    total: int = 0


import random

def generate_order_id():
    return f"GKZNO:{random.randint(100000, 999999)}"

class Order(OrderCreate):
    id: str = Field(default_factory=generate_order_id)
    status: str = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StatusUpdate(BaseModel):
    status: str


class UserCreateInput(RegisterInput):
    role: Literal["customer", "chef", "admin"] = "customer"


class RoleUpdate(BaseModel):
    role: Literal["customer", "chef", "admin"]


# ===================== AUTH ROUTES =====================
@api_router.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    return {
        "token": token,
        "user": {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "customer")},
    }

@api_router.post("/auth/register")
async def register(data: RegisterInput):
    email = data.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    new_user = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name.strip(),
        "role": "customer",
        "phone": data.phone.strip() if data.phone else "",
        "address": data.address.strip() if data.address else "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id, email)
    return {
        "token": token,
        "user": {
            "id": user_id, "email": email, "name": new_user["name"],
            "role": "customer", "phone": new_user["phone"], "address": new_user["address"]
        },
    }

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["_id"], "email": user["email"],
        "name": user.get("name", "User"), "role": user.get("role", "customer"),
        "phone": user.get("phone", ""), "address": user.get("address", ""),
    }


# ===================== MENU ROUTES =====================
@api_router.get("/menu")
async def list_menu():
    docs = await db.menu.find({}, {"_id": 0}).to_list(1000)
    return docs

@api_router.post("/menu")
async def add_menu_item(data: MenuItem, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    data.id = str(uuid.uuid4())
    await db.menu.insert_one(data.model_dump())
    return data

@api_router.put("/menu/{item_id}")
async def update_menu_item(item_id: str, data: MenuItem, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    update_data = {k: v for k, v in data.model_dump().items() if k != "id"}
    result = await db.menu.find_one_and_update(
        {"id": item_id}, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    result.pop("_id", None)
    return result

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.menu.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# ===================== USERS ROUTES (Admin) =====================
@api_router.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    docs = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    # Convert _id to string for the frontend
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
    return docs

@api_router.post("/users")
async def create_user(data: UserCreateInput, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    email = data.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    new_user = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name.strip(),
        "role": data.role,
        "phone": data.phone.strip() if data.phone else "",
        "address": data.address.strip() if data.address else "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    new_user.pop("_id", None)
    new_user.pop("password_hash")
    return new_user

@api_router.patch("/users/{target_user_id}/role")
async def update_user_role(target_user_id: str, data: RoleUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        obj_id = ObjectId(target_user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    result = await db.users.find_one_and_update(
        {"_id": obj_id},
        {"$set": {"role": data.role}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    result["id"] = str(result.pop("_id"))
    result.pop("password_hash", None)
    return result


# ===================== ORDER ROUTES =====================
@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    order = Order(**data.model_dump())
    await db.orders.insert_one(order.model_dump())
    logger.info(f"New order {order.id} from {order.customer_name} ({order.phone})")
    return order


@api_router.get("/orders", response_model=List[Order])
async def list_orders(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status and status != "all":
        query["status"] = status
    docs = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/orders/stats")
async def order_stats(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    docs = await db.orders.find({}, {"_id": 0}).to_list(5000)
    total = len(docs)
    new_count = sum(1 for d in docs if d.get("status") == "new")
    today_count = sum(1 for d in docs if str(d.get("created_at", "")).startswith(today))
    revenue = sum(int(d.get("total", 0)) for d in docs if d.get("status") == "delivered")
    return {"total": total, "new": new_count, "today": today_count, "revenue": revenue}


@api_router.patch("/orders/{order_id}/status", response_model=Order)
async def update_status(order_id: str, data: StatusUpdate, user: dict = Depends(get_current_user)):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.orders.find_one_and_update(
        {"id": order_id}, {"$set": {"status": data.status}}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    result.pop("_id", None)
    return result


@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user: dict = Depends(get_current_user)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "Ghar Ka Zaiqa API"}


# ===================== IMAGE UPLOAD (with server-side compression) =====================
class ImageUploadRequest(BaseModel):
    image_data: str  # base64 data URL e.g. "data:image/jpeg;base64,..."
    max_width: int = 600


@api_router.post("/upload-image")
async def upload_image(data: ImageUploadRequest, user: dict = Depends(get_current_user)):
    """Accept a base64 image, compress it server-side using Pillow, return compressed base64."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        import base64, io
        from PIL import Image

        # Strip data URL prefix if present
        img_str = data.image_data
        if "," in img_str:
            img_str = img_str.split(",", 1)[1]

        raw = base64.b64decode(img_str)
        img = Image.open(io.BytesIO(raw)).convert("RGBA")

        # Resize keeping aspect ratio
        w, h = img.size
        if w > data.max_width:
            new_h = int(h * data.max_width / w)
            img = img.resize((data.max_width, new_h), Image.LANCZOS)

        # Save as compressed WEBP to preserve transparency
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=80, method=6)
        buf.seek(0)

        compressed_b64 = "data:image/webp;base64," + base64.b64encode(buf.read()).decode()
        orig_kb = len(raw) / 1024
        comp_kb = buf.tell() / 1024 if buf.tell() else len(base64.b64decode(compressed_b64.split(",")[1])) / 1024
        logger.info(f"Image compressed: {orig_kb:.0f}KB → {comp_kb:.0f}KB")
        return {"image_data": compressed_b64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")


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
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password: {admin_email}")

    chef_email = os.environ.get("CHEF_EMAIL", "chef@gharkazaiqa.com").strip().lower()
    chef_password = os.environ.get("CHEF_PASSWORD", "ChefZaiqa2026")
    existing_chef = await db.users.find_one({"email": chef_email})
    if existing_chef is None:
        await db.users.insert_one({
            "email": chef_email,
            "password_hash": hash_password(chef_password),
            "name": "Chef",
            "role": "chef",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded chef: {chef_email}")
    elif not verify_password(chef_password, existing_chef["password_hash"]):
        await db.users.update_one({"email": chef_email}, {"$set": {"password_hash": hash_password(chef_password)}})
        logger.info(f"Updated chef password: {chef_email}")

    # Seed default menu items if collection is empty
    if await db.menu.count_documents({}) == 0:
        default_menu = [
            {"id": str(uuid.uuid4()), "name": "Daal Chawal", "description": "Home-style yellow lentils with steamed rice", "price": 180, "category": "Main", "available": True, "img": ""},
            {"id": str(uuid.uuid4()), "name": "Aloo Gosht", "description": "Tender mutton with potatoes in rich gravy", "price": 320, "category": "Main", "available": True, "img": ""},
            {"id": str(uuid.uuid4()), "name": "Chicken Karahi", "description": "Wok-tossed chicken with tomatoes and spices", "price": 280, "category": "Main", "available": True, "img": ""},
            {"id": str(uuid.uuid4()), "name": "Biryani (Chicken)", "description": "Fragrant long-grain rice with spiced chicken", "price": 250, "category": "Rice", "available": True, "img": ""},
            {"id": str(uuid.uuid4()), "name": "Halwa Puri", "description": "Weekend breakfast special with chana and achar", "price": 150, "category": "Breakfast", "available": True, "img": ""},
            {"id": str(uuid.uuid4()), "name": "Shahi Tukray", "description": "Milk-soaked bread dessert with cream", "price": 120, "category": "Dessert", "available": True, "img": ""},
        ]
        await db.menu.insert_many(default_menu)
        logger.info(f"Seeded {len(default_menu)} default menu items")

    await db.users.create_index("email", unique=True)
    await db.orders.create_index("created_at")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
