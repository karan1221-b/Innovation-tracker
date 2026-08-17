"""Seed demo categories, demo professionals, and the admin account."""
import os

from auth import Role, hash_password
from database import db, now_utc

CATEGORIES = [
    {"slug": "plumbing", "name": "Plumbing", "icon": "water", "description": "Leaks, taps, pipes, drainage"},
    {"slug": "electrical", "name": "Electrical", "icon": "flash", "description": "Wiring, switches, fixtures"},
    {"slug": "ac_cooling", "name": "AC & Cooling", "icon": "snow", "description": "AC, coolers, refrigeration"},
    {"slug": "appliance_repair", "name": "Appliance Repair", "icon": "build", "description": "Washing machine, TV, geyser"},
    {"slug": "cleaning", "name": "Cleaning", "icon": "sparkles", "description": "Home & deep cleaning"},
    {"slug": "carpentry", "name": "Carpentry", "icon": "hammer", "description": "Wood work, doors, repairs"},
    {"slug": "painting", "name": "Painting", "icon": "color-palette", "description": "Walls, texture, touch-ups"},
    {"slug": "pest_control", "name": "Pest Control", "icon": "bug", "description": "Cockroach, termite, mosquito"},
    {"slug": "furniture_assembly", "name": "Furniture Assembly", "icon": "cube", "description": "Assemble & install furniture"},
    {"slug": "installation", "name": "Installation", "icon": "hardware-chip", "description": "Appliance & fixture setup"},
    {"slug": "other", "name": "Other", "icon": "ellipsis-horizontal", "description": "Anything else"},
]

AV_M = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=400&q=80"
AV_F = "https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=srgb&fm=jpg&w=400&q=80"

DEMO_PROS = [
    {"name": "Raj Kumar", "business_name": "Raj Plumbing Services", "category": "plumbing",
     "skills": ["Leak repair", "Tap fitting", "Drainage", "Water tank"], "experience_years": 8,
     "rating": 4.8, "jobs_completed": 1240, "distance_km": 2.1, "eta_minutes": 25,
     "price_min": 400, "price_max": 700, "photo": AV_M, "response_time_minutes": 5},
    {"name": "Anita Sharma", "business_name": "CoolTech AC Services", "category": "ac_cooling",
     "skills": ["AC service", "Gas refill", "Cooling repair", "Installation"], "experience_years": 6,
     "rating": 4.7, "jobs_completed": 875, "distance_km": 3.4, "eta_minutes": 40,
     "price_min": 500, "price_max": 1200, "photo": AV_F, "response_time_minutes": 8},
    {"name": "Vikram Singh", "business_name": "BrightSpark Electrical", "category": "electrical",
     "skills": ["Wiring", "Switch repair", "MCB", "Fan installation"], "experience_years": 10,
     "rating": 4.9, "jobs_completed": 1540, "distance_km": 1.5, "eta_minutes": 20,
     "price_min": 300, "price_max": 900, "photo": AV_M, "response_time_minutes": 4},
    {"name": "Meena Nair", "business_name": "SparkleClean Home", "category": "cleaning",
     "skills": ["Deep cleaning", "Kitchen", "Bathroom", "Sofa cleaning"], "experience_years": 4,
     "rating": 4.6, "jobs_completed": 620, "distance_km": 4.0, "eta_minutes": 50,
     "price_min": 600, "price_max": 1500, "photo": AV_F, "response_time_minutes": 12},
    {"name": "Suresh Patel", "business_name": "FixWell Appliances", "category": "appliance_repair",
     "skills": ["Washing machine", "Refrigerator", "Microwave", "Geyser"], "experience_years": 7,
     "rating": 4.5, "jobs_completed": 980, "distance_km": 2.8, "eta_minutes": 35,
     "price_min": 350, "price_max": 800, "photo": AV_M, "response_time_minutes": 7},
    {"name": "Deepak Verma", "business_name": "WoodCraft Carpentry", "category": "carpentry",
     "skills": ["Door repair", "Furniture", "Cabinets", "Polishing"], "experience_years": 12,
     "rating": 4.8, "jobs_completed": 1100, "distance_km": 5.2, "eta_minutes": 60,
     "price_min": 400, "price_max": 2000, "photo": AV_M, "response_time_minutes": 15},
    {"name": "Ramesh Yadav", "business_name": "ColorPro Painters", "category": "painting",
     "skills": ["Wall painting", "Texture", "Waterproofing", "Touch-up"], "experience_years": 9,
     "rating": 4.7, "jobs_completed": 540, "distance_km": 6.1, "eta_minutes": 70,
     "price_min": 800, "price_max": 5000, "photo": AV_M, "response_time_minutes": 20},
    {"name": "Kavya Reddy", "business_name": "SafeHome Pest Control", "category": "pest_control",
     "skills": ["Cockroach", "Termite", "Bed bugs", "Mosquito"], "experience_years": 5,
     "rating": 4.6, "jobs_completed": 430, "distance_km": 3.9, "eta_minutes": 45,
     "price_min": 700, "price_max": 2500, "photo": AV_F, "response_time_minutes": 10},
]


async def seed():
    # Categories
    for c in CATEGORIES:
        await db.categories.update_one({"slug": c["slug"]}, {"$set": c}, upsert=True)

    # Admin account
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@fixit.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    await db.users.update_one(
        {"email": admin_email},
        {"$setOnInsert": {
            "email": admin_email,
            "name": "FixIt Admin",
            "hashed_password": hash_password(admin_pw),
            "role": Role.admin.value,
            "phone": "",
            "disabled": False,
            "created_at": now_utc(),
        }},
        upsert=True,
    )

    # Demo professionals (idempotent by business_name)
    for p in DEMO_PROS:
        doc = {
            "user_id": None,
            "name": p["name"],
            "business_name": p["business_name"],
            "category": p["category"],
            "skills": p["skills"],
            "experience_years": p["experience_years"],
            "rating": p["rating"],
            "jobs_completed": p["jobs_completed"],
            "distance_km": p["distance_km"],
            "eta_minutes": p["eta_minutes"],
            "price_min": p["price_min"],
            "price_max": p["price_max"],
            "photo_url": p["photo"],
            "response_time_minutes": p["response_time_minutes"],
            "description": f"{p['business_name']} — trusted {p['category'].replace('_', ' ')} experts with {p['experience_years']} years of experience.",
            "service_area": "Bengaluru, Karnataka",
            "portfolio": [],
            "availability": "available",
            "verification_status": "verified",
            "is_demo": True,
        }
        await db.professionals.update_one(
            {"business_name": p["business_name"], "is_demo": True},
            {"$setOnInsert": {**doc, "created_at": now_utc()}},
            upsert=True,
        )

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.professionals.create_index("category")
    await db.bookings.create_index("customer_id")
    await db.bookings.create_index("professional_id")
    await db.messages.create_index("booking_id")
