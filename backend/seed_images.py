import asyncio
import base64
import os
import uuid
import io
from PIL import Image
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_URL", "mongodb+srv://mubaid787898_db_user:p34BHl8eifzDnq6G@ghrkazaiqa.adshfog.mongodb.net/gharkazaiqa?retryWrites=true&w=majority&appName=GhrKaZaiqa")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("gharkazaiqa")

highlights = [
  {"id": "white-karahi", "name": "White Karahi", "description": "With salad & roti", "price": 400, "category": "Main", "available": True, "img_file": "whiteKarahi-removebg-preview.png"},
  {"id": "chicken-biryani", "name": "Chicken Biryani", "description": "With raita & salad", "price": 400, "category": "Main", "available": True, "img_file": "dishBiryani.png"},
  {"id": "chicken-karahi", "name": "Chicken Karahi", "description": "With roti & salad", "price": 400, "category": "Main", "available": True, "img_file": "karahi.png"},
  {"id": "chicken-pulao", "name": "Chicken Pulao", "description": "With raita", "price": 400, "category": "Main", "available": True, "img_file": "chickenPulao.png"},
  {"id": "makhni-channay", "name": "Makhni Channay", "description": "With Russian salad", "price": 400, "category": "Main", "available": True, "img_file": "chane.png"},
  {"id": "dahi-bhallay", "name": "Dahi Bhallay", "description": "Cool & tangy", "price": 400, "category": "Sides", "available": True, "img_file": "dahiBhalle.png"},
  {"id": "russian-salad", "name": "Russian Salad", "description": "Fresh creamy side", "price": 400, "category": "Sides", "available": True, "img_file": "russianSalad.png"},
  {"id": "roasted-chicken", "name": "Roasted Chicken", "description": "With sauce & salad", "price": 400, "category": "Main", "available": True, "img_file": "rostedChicken.png"},
  {"id": "kari-pakora", "name": "Kari Pakora", "description": "With steamed rice", "price": 400, "category": "Main", "available": True, "img_file": "kari.png"},
]

async def seed():
    print("Clearing old menu items...")
    await db.menu.delete_many({})

    assets_dir = "/home/drpc/Desktop/zaiqa_sehat/Ghar_ka_zaiqa/frontend/src/assets"

    new_items = []
    for h in highlights:
        file_path = os.path.join(assets_dir, h["img_file"])
        img_b64 = ""
        if os.path.exists(file_path):
            with Image.open(file_path) as img:
                img = img.convert("RGBA")
                # Auto-crop transparent padding so plates are visually consistent in size
                bbox = img.getbbox()
                if bbox:
                    img = img.crop(bbox)
                
                w, ht = img.size
                max_width = 600
                if w > max_width:
                    new_h = int(ht * max_width / w)
                    img = img.resize((max_width, new_h), Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="WEBP", quality=80, method=6)
                buf.seek(0)
                img_b64 = "data:image/webp;base64," + base64.b64encode(buf.read()).decode()
                print(f"Compressed {h['img_file']}")
        else:
            print(f"Not found: {file_path}")

        new_items.append({
            "id": h["id"],
            "name": h["name"],
            "description": h["description"],
            "price": h["price"],
            "category": h["category"],
            "available": h["available"],
            "img": img_b64
        })

    if new_items:
        await db.menu.insert_many(new_items)
        print(f"Seeded {len(new_items)} items to db!")

asyncio.run(seed())
