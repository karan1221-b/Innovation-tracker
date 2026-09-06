"""FixIt backend API."""
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

import ai_service
import storage
from auth import (Role, create_access_token, current_user, hash_password,
                  require_roles, verify_password)
from database import db, now_utc
from seed_data import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fixit")

app = FastAPI(title="FixIt API")
api = APIRouter(prefix="/api")

# ----------------------- Enums -----------------------
BOOKING_FLOW = [
    "requested", "confirmed", "on_the_way", "arrived",
    "work_started", "work_completed", "paid", "reviewed",
]


class BookingStatus(str, Enum):
    requested = "requested"
    confirmed = "confirmed"
    on_the_way = "on_the_way"
    arrived = "arrived"
    work_started = "work_started"
    work_completed = "work_completed"
    paid = "paid"
    reviewed = "reviewed"
    cancelled = "cancelled"


# ----------------------- Schemas -----------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    phone: str = ""
    role: str = "customer"  # customer | professional


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ClassifyIn(BaseModel):
    text: str = ""
    media_urls: List[str] = []


class BookingIn(BaseModel):
    professional_id: str
    category: str
    problem_text: str
    address: str
    scheduled_date: str
    scheduled_time: str
    urgency: str = "normal"  # normal | emergency
    instructions: str = ""
    media_urls: List[str] = []
    estimated_price_min: Optional[float] = None
    estimated_price_max: Optional[float] = None


class StatusUpdateIn(BaseModel):
    status: str
    note: str = ""


class QuoteIn(BaseModel):
    final_price: float


class MessageIn(BaseModel):
    text: str = ""
    media_url: str = ""


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class AvailabilityIn(BaseModel):
    availability: str  # available | busy | offline


class VerifyIn(BaseModel):
    status: str  # verified | rejected | suspended | pending


# ----------------------- Helpers -----------------------
def oid(v: str) -> ObjectId:
    if not ObjectId.is_valid(v):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(v)


def clean(doc: dict) -> dict:
    """Convert a mongo document to a JSON-safe dict (id as str)."""
    if not doc:
        return doc
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if isinstance(v, ObjectId):
            d[k] = str(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def public_user(u: dict) -> dict:
    return {"id": str(u["_id"]), "name": u.get("name", ""), "email": u["email"],
            "role": u["role"], "phone": u.get("phone", ""),
            "photo_url": u.get("photo_url", "")}


async def notify(user_id, title: str, body: str, ntype: str = "info"):
    if not user_id:
        return
    await db.notifications.insert_one({
        "user_id": str(user_id), "title": title, "body": body, "type": ntype,
        "read": False, "created_at": now_utc(),
    })


async def enrich_booking(b: dict) -> dict:
    d = clean(b)
    pro = await db.professionals.find_one({"_id": oid(d["professional_id"])}) if d.get("professional_id") else None
    if pro:
        d["professional"] = {
            "id": str(pro["_id"]), "name": pro["name"], "business_name": pro["business_name"],
            "photo_url": pro.get("photo_url", ""), "rating": pro.get("rating", 0),
            "category": pro.get("category"), "verification_status": pro.get("verification_status"),
        }
    return d


# ----------------------- Auth -----------------------
@api.post("/auth/register")
async def register(data: RegisterIn):
    role = data.role if data.role in ("customer", "professional") else "customer"
    email = str(data.email).lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    doc = {
        "name": data.name, "email": email,
        "hashed_password": hash_password(data.password),
        "role": role, "phone": data.phone, "photo_url": "",
        "disabled": False, "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id

    if role == "professional":
        await db.professionals.insert_one({
            "user_id": str(res.inserted_id), "name": data.name,
            "business_name": data.name, "category": "other", "skills": [],
            "experience_years": 0, "rating": 0.0, "jobs_completed": 0,
            "distance_km": 0.0, "eta_minutes": 30, "price_min": 0, "price_max": 0,
            "photo_url": "", "response_time_minutes": 30,
            "description": "", "service_area": "", "portfolio": [],
            "availability": "offline", "verification_status": "pending",
            "is_demo": False, "created_at": now_utc(),
        })

    token = create_access_token(str(res.inserted_id), role)
    return {"access_token": token, "user": public_user(doc)}


@api.post("/auth/login")
async def login(data: LoginIn):
    email = str(data.email).lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if user.get("disabled"):
        raise HTTPException(status_code=403, detail="This account has been suspended.")
    token = create_access_token(str(user["_id"]), user["role"])
    return {"access_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None


@api.patch("/auth/me")
async def update_me(data: ProfileUpdate, user: dict = Depends(current_user)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"_id": user["_id"]}, {"$set": upd})
    u = await db.users.find_one({"_id": user["_id"]})
    return public_user(u)


@api.delete("/auth/me")
async def delete_me(user: dict = Depends(current_user)):
    """Permanently delete the signed-in account and associated personal data."""
    uid = str(user["_id"])
    if user["role"] == "professional":
        pro = await db.professionals.find_one({"user_id": uid})
        if pro:
            pid = str(pro["_id"])
            booking_ids = [str(b["_id"]) for b in await db.bookings.find({"professional_id": pid}, {"_id": 1}).to_list(1000)]
            if booking_ids:
                await db.messages.delete_many({"booking_id": {"$in": booking_ids}})
            await db.bookings.delete_many({"professional_id": pid})
            await db.reviews.delete_many({"professional_id": pid})
            await db.messages.delete_many({"sender_id": uid})
            await db.professionals.delete_one({"_id": pro["_id"]})
    else:
        booking_ids = [str(b["_id"]) for b in await db.bookings.find({"customer_id": uid}, {"_id": 1}).to_list(1000)]
        if booking_ids:
            await db.messages.delete_many({"booking_id": {"$in": booking_ids}})
        await db.bookings.delete_many({"customer_id": uid})
        await db.reviews.delete_many({"customer_id": uid})
        await db.messages.delete_many({"sender_id": uid})
    await db.uploads.delete_many({"owner_id": uid})
    await db.notifications.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": user["_id"]})
    return {"ok": True, "message": "Your account and data have been deleted."}


# ----------------------- Categories & AI -----------------------
@api.get("/categories")
async def get_categories():
    cats = await db.categories.find().to_list(100)
    return [clean(c) for c in cats]


@api.post("/ai/classify")
async def classify(data: ClassifyIn, user: dict = Depends(current_user)):
    result = await ai_service.classify_problem(data.text, len(data.media_urls))
    return result


# ----------------------- Professionals -----------------------
def rank_professionals(pros: List[dict], urgency: str = "normal") -> List[dict]:
    avail_score = {"available": 2, "busy": 1, "offline": 0}

    def score(p):
        s = 0.0
        s += avail_score.get(p.get("availability", "offline"), 0) * 30
        s += p.get("rating", 0) * 8
        s += min(p.get("jobs_completed", 0), 2000) / 100
        s -= p.get("distance_km", 0) * 2
        s -= p.get("response_time_minutes", 30) * 0.3
        if urgency == "emergency":
            s -= p.get("eta_minutes", 60) * 1.5
        if p.get("verification_status") == "verified":
            s += 15
        return s

    return sorted(pros, key=score, reverse=True)


@api.get("/professionals")
async def list_professionals(
    category: Optional[str] = None,
    urgency: str = "normal",
    user: dict = Depends(current_user),
):
    q = {"verification_status": "verified"}
    if category:
        q["category"] = category
    pros = await db.professionals.find(q).to_list(200)
    ranked = rank_professionals(pros, urgency)
    return [clean(p) for p in ranked]


@api.get("/professionals/{pid}")
async def get_professional(pid: str, user: dict = Depends(current_user)):
    pro = await db.professionals.find_one({"_id": oid(pid)})
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found.")
    reviews = await db.reviews.find({"professional_id": pid}).sort("created_at", -1).to_list(50)
    out = clean(pro)
    out["reviews"] = [clean(r) for r in reviews]
    return out


# ----------------------- Bookings -----------------------
@api.post("/bookings")
async def create_booking(data: BookingIn, user: dict = Depends(require_roles(Role.customer))):
    pro = await db.professionals.find_one({"_id": oid(data.professional_id)})
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found.")
    if pro.get("availability") == "offline":
        raise HTTPException(status_code=409, detail="This professional is currently offline. Please choose another.")

    est_min = data.estimated_price_min if data.estimated_price_min is not None else pro.get("price_min", 0)
    est_max = data.estimated_price_max if data.estimated_price_max is not None else pro.get("price_max", 0)
    ts = now_utc()
    booking = {
        "customer_id": str(user["_id"]),
        "customer_name": user.get("name", ""),
        "professional_id": data.professional_id,
        "category": data.category,
        "problem_text": data.problem_text,
        "address": data.address,
        "scheduled_date": data.scheduled_date,
        "scheduled_time": data.scheduled_time,
        "urgency": data.urgency,
        "instructions": data.instructions,
        "media_urls": data.media_urls,
        "estimated_price_min": est_min,
        "estimated_price_max": est_max,
        "final_price": None,
        "status": "requested",
        "status_history": [{"status": "requested", "note": "Request submitted", "at": ts.isoformat()}],
        "payment_status": "pending",
        "payment_method": None,
        "review_id": None,
        "created_at": ts,
    }
    res = await db.bookings.insert_one(booking)
    booking["_id"] = res.inserted_id

    if pro.get("user_id"):
        await notify(pro["user_id"], "New booking request",
                     f"{user.get('name','A customer')} needs help: {data.problem_text[:50]}", "booking")
    return await enrich_booking(booking)


@api.get("/bookings")
async def list_bookings(user: dict = Depends(current_user)):
    if user["role"] == "customer":
        q = {"customer_id": str(user["_id"])}
    elif user["role"] == "professional":
        pro = await db.professionals.find_one({"user_id": str(user["_id"])})
        if not pro:
            return []
        q = {"professional_id": str(pro["_id"])}
    else:
        q = {}
    bookings = await db.bookings.find(q).sort("created_at", -1).to_list(200)
    return [await enrich_booking(b) for b in bookings]


@api.get("/bookings/{bid}")
async def get_booking(bid: str, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return await enrich_booking(b)


# who is allowed to set each status
CUSTOMER_STATUSES = {"cancelled", "paid"}
PRO_STATUSES = {"confirmed", "on_the_way", "arrived", "work_started", "work_completed", "cancelled"}


@api.patch("/bookings/{bid}/status")
async def update_status(bid: str, data: StatusUpdateIn, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    new_status = data.status
    if new_status not in BookingStatus._value2member_map_:
        raise HTTPException(status_code=400, detail="Invalid status.")

    role = user["role"]
    if role == "customer":
        if b["customer_id"] != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Not your booking.")
        if new_status not in CUSTOMER_STATUSES:
            raise HTTPException(status_code=403, detail="You cannot set this status.")
    elif role == "professional":
        pro = await db.professionals.find_one({"user_id": str(user["_id"])})
        if not pro or b["professional_id"] != str(pro["_id"]):
            raise HTTPException(status_code=403, detail="Not your booking.")
        if new_status not in PRO_STATUSES:
            raise HTTPException(status_code=403, detail="You cannot set this status.")

    entry = {"status": new_status, "note": data.note, "at": now_utc().isoformat()}
    await db.bookings.update_one(
        {"_id": oid(bid)},
        {"$set": {"status": new_status}, "$push": {"status_history": entry}},
    )
    # Notifications
    labels = {
        "confirmed": "Booking confirmed", "on_the_way": "Professional on the way",
        "arrived": "Professional arrived", "work_started": "Work started",
        "work_completed": "Work completed", "cancelled": "Booking cancelled",
        "paid": "Payment received",
    }
    if role == "professional":
        await notify(b["customer_id"], labels.get(new_status, "Booking updated"),
                     f"Your booking status is now: {new_status.replace('_',' ')}", "booking")
    else:
        pro = await db.professionals.find_one({"_id": oid(b["professional_id"])})
        if pro and pro.get("user_id"):
            await notify(pro["user_id"], labels.get(new_status, "Booking updated"),
                         f"Booking {new_status.replace('_',' ')} by customer", "booking")

    if new_status == "work_completed":
        await db.professionals.update_one({"_id": oid(b["professional_id"])},
                                          {"$inc": {"jobs_completed": 1}})
    updated = await db.bookings.find_one({"_id": oid(bid)})
    return await enrich_booking(updated)


@api.patch("/bookings/{bid}/quote")
async def revise_quote(bid: str, data: QuoteIn, user: dict = Depends(require_roles(Role.professional))):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    pro = await db.professionals.find_one({"user_id": str(user["_id"])})
    if not pro or b["professional_id"] != str(pro["_id"]):
        raise HTTPException(status_code=403, detail="Not your booking.")
    await db.bookings.update_one({"_id": oid(bid)}, {"$set": {"final_price": data.final_price}})
    await notify(b["customer_id"], "Price updated",
                 f"The professional set the final price to ₹{data.final_price:.0f}. Please approve at payment.", "price")
    updated = await db.bookings.find_one({"_id": oid(bid)})
    return await enrich_booking(updated)


class PayIn(BaseModel):
    method: str = "cash"  # cash | upi | card | wallet


@api.post("/bookings/{bid}/pay")
async def pay_booking(bid: str, data: PayIn, user: dict = Depends(require_roles(Role.customer))):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b or b["customer_id"] != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Booking not found.")
    # Payment gateway integration pending; cash marks as paid, others recorded as pending gateway.
    settings = await db.settings.find_one({"_id": "platform"}) or {}
    commission_pct = settings.get("commission_pct", 10)
    amount = b.get("final_price") or b.get("estimated_price_max") or 0
    commission = round(amount * commission_pct / 100, 2)
    payout = round(amount - commission, 2)
    status_val = "paid" if data.method == "cash" else "pending_gateway"
    await db.bookings.update_one({"_id": oid(bid)}, {"$set": {
        "payment_status": status_val, "payment_method": data.method,
        "amount": amount, "commission": commission, "payout": payout,
        "status": "paid",
    }, "$push": {"status_history": {"status": "paid", "note": f"Paid via {data.method}", "at": now_utc().isoformat()}}})
    updated = await db.bookings.find_one({"_id": oid(bid)})
    return await enrich_booking(updated)


# ----------------------- Messages -----------------------
async def _assert_booking_party(b: dict, user: dict):
    if user["role"] == "customer" and b["customer_id"] == str(user["_id"]):
        return
    if user["role"] == "professional":
        pro = await db.professionals.find_one({"user_id": str(user["_id"])})
        if pro and b["professional_id"] == str(pro["_id"]):
            return
    if user["role"] == "admin":
        return
    raise HTTPException(status_code=403, detail="Not part of this conversation.")


@api.get("/bookings/{bid}/messages")
async def get_messages(bid: str, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    await _assert_booking_party(b, user)
    msgs = await db.messages.find({"booking_id": bid}).sort("created_at", 1).to_list(500)
    return [clean(m) for m in msgs]


@api.post("/bookings/{bid}/messages")
async def send_message(bid: str, data: MessageIn, user: dict = Depends(current_user)):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    await _assert_booking_party(b, user)
    msg = {
        "booking_id": bid, "sender_id": str(user["_id"]), "sender_role": user["role"],
        "sender_name": user.get("name", ""), "text": data.text, "media_url": data.media_url,
        "created_at": now_utc(),
    }
    res = await db.messages.insert_one(msg)
    msg["_id"] = res.inserted_id
    # notify the other party
    if user["role"] == "customer":
        pro = await db.professionals.find_one({"_id": oid(b["professional_id"])})
        if pro and pro.get("user_id"):
            await notify(pro["user_id"], "New message", data.text[:60] or "Photo", "message")
    else:
        await notify(b["customer_id"], "New message", data.text[:60] or "Photo", "message")
    return clean(msg)


# ----------------------- Reviews -----------------------
@api.post("/bookings/{bid}/review")
async def add_review(bid: str, data: ReviewIn, user: dict = Depends(require_roles(Role.customer))):
    b = await db.bookings.find_one({"_id": oid(bid)})
    if not b or b["customer_id"] != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Booking not found.")
    if b.get("review_id"):
        raise HTTPException(status_code=409, detail="You have already reviewed this booking.")
    review = {
        "booking_id": bid, "customer_id": str(user["_id"]),
        "customer_name": user.get("name", ""),
        "professional_id": b["professional_id"], "rating": data.rating,
        "comment": data.comment, "flagged": False, "created_at": now_utc(),
    }
    res = await db.reviews.insert_one(review)
    await db.bookings.update_one({"_id": oid(bid)}, {"$set": {"review_id": str(res.inserted_id), "status": "reviewed"}})
    # recompute pro rating
    revs = await db.reviews.find({"professional_id": b["professional_id"]}).to_list(1000)
    if revs:
        avg = round(sum(r["rating"] for r in revs) / len(revs), 2)
        await db.professionals.update_one({"_id": oid(b["professional_id"])}, {"$set": {"rating": avg}})
    review["_id"] = res.inserted_id
    return clean(review)


# ----------------------- Professional dashboard -----------------------
@api.get("/pro/profile")
async def pro_profile(user: dict = Depends(require_roles(Role.professional))):
    pro = await db.professionals.find_one({"user_id": str(user["_id"])})
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    return clean(pro)


class ProProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    category: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    description: Optional[str] = None
    service_area: Optional[str] = None
    photo_url: Optional[str] = None
    eta_minutes: Optional[int] = None


@api.patch("/pro/profile")
async def update_pro_profile(data: ProProfileUpdate, user: dict = Depends(require_roles(Role.professional))):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if upd:
        await db.professionals.update_one({"user_id": str(user["_id"])}, {"$set": upd})
    pro = await db.professionals.find_one({"user_id": str(user["_id"])})
    return clean(pro)


@api.patch("/pro/availability")
async def set_availability(data: AvailabilityIn, user: dict = Depends(require_roles(Role.professional))):
    if data.availability not in ("available", "busy", "offline"):
        raise HTTPException(status_code=400, detail="Invalid availability.")
    await db.professionals.update_one({"user_id": str(user["_id"])}, {"$set": {"availability": data.availability}})
    pro = await db.professionals.find_one({"user_id": str(user["_id"])})
    return clean(pro)


@api.get("/pro/dashboard")
async def pro_dashboard(user: dict = Depends(require_roles(Role.professional))):
    pro = await db.professionals.find_one({"user_id": str(user["_id"])})
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found.")
    pid = str(pro["_id"])
    bookings = await db.bookings.find({"professional_id": pid}).sort("created_at", -1).to_list(300)
    earnings = sum((b.get("payout") or 0) for b in bookings if b.get("payment_status") in ("paid", "pending_gateway"))
    completed = [b for b in bookings if b["status"] in ("work_completed", "paid", "reviewed")]
    new_requests = [b for b in bookings if b["status"] == "requested"]
    active = [b for b in bookings if b["status"] in ("confirmed", "on_the_way", "arrived", "work_started")]
    return {
        "profile": clean(pro),
        "metrics": {
            "today_earnings": round(earnings, 2),
            "jobs_completed": len(completed),
            "rating": pro.get("rating", 0),
            "active_jobs": len(active),
        },
        "new_requests": [await enrich_booking(b) for b in new_requests],
        "active": [await enrich_booking(b) for b in active],
        "completed": [await enrich_booking(b) for b in completed[:20]],
    }


# ----------------------- Notifications -----------------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(current_user)):
    notes = await db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
    return [clean(n) for n in notes]


@api.patch("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"_id": oid(nid), "user_id": str(user["_id"])}, {"$set": {"read": True}})
    return {"ok": True}


# ----------------------- Uploads -----------------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 25MB.")
    ext = (file.filename or "file").split(".")[-1].lower()
    path = f"{storage.APP_NAME}/uploads/{user['_id']}/{uuid.uuid4()}.{ext}"
    try:
        await run_in_threadpool(storage.put_object, path, data, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.exception("upload failed")
        raise HTTPException(status_code=502, detail="Upload failed. Please try again.")
    await db.uploads.insert_one({
        "owner_id": str(user["_id"]), "storage_path": path,
        "filename": file.filename, "content_type": file.content_type, "created_at": now_utc(),
    })
    return {"path": path, "url": f"/api/files/{path}"}


@api.get("/files/{path:path}")
async def get_file(path: str):
    rec = await db.uploads.find_one({"storage_path": path})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        content, ctype = await run_in_threadpool(storage.get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


# ----------------------- Admin -----------------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles(Role.admin))):
    total_users = await db.users.count_documents({})
    customers = await db.users.count_documents({"role": "customer"})
    pros = await db.professionals.count_documents({})
    pending_pros = await db.professionals.count_documents({"verification_status": "pending"})
    total_bookings = await db.bookings.count_documents({})
    completed = await db.bookings.count_documents({"status": {"$in": ["work_completed", "paid", "reviewed"]}})
    cancelled = await db.bookings.count_documents({"status": "cancelled"})
    paid_bookings = await db.bookings.find({"payment_status": {"$in": ["paid", "pending_gateway"]}}).to_list(2000)
    revenue = sum((b.get("amount") or 0) for b in paid_bookings)
    commission = sum((b.get("commission") or 0) for b in paid_bookings)
    settings = await db.settings.find_one({"_id": "platform"}) or {}
    return {
        "total_users": total_users, "customers": customers, "professionals": pros,
        "pending_verifications": pending_pros, "total_bookings": total_bookings,
        "completed_jobs": completed, "cancelled": cancelled,
        "revenue": round(revenue, 2), "commission": round(commission, 2),
        "cancellation_rate": round((cancelled / total_bookings * 100) if total_bookings else 0, 1),
        "commission_pct": settings.get("commission_pct", 10),
    }


@api.get("/admin/professionals")
async def admin_professionals(status: Optional[str] = None, user: dict = Depends(require_roles(Role.admin))):
    q = {}
    if status:
        q["verification_status"] = status
    pros = await db.professionals.find(q).sort("created_at", -1).to_list(500)
    return [clean(p) for p in pros]


@api.patch("/admin/professionals/{pid}/verify")
async def verify_professional(pid: str, data: VerifyIn, user: dict = Depends(require_roles(Role.admin))):
    if data.status not in ("verified", "rejected", "suspended", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status.")
    await db.professionals.update_one({"_id": oid(pid)}, {"$set": {"verification_status": data.status}})
    pro = await db.professionals.find_one({"_id": oid(pid)})
    if pro and pro.get("user_id"):
        await notify(pro["user_id"], "Verification update",
                     f"Your professional account is now {data.status}.", "account")
    return clean(pro)


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_roles(Role.admin))):
    users = await db.users.find({"role": {"$ne": "admin"}}).sort("created_at", -1).to_list(500)
    return [{"id": str(u["_id"]), "name": u.get("name"), "email": u["email"],
             "role": u["role"], "disabled": u.get("disabled", False)} for u in users]


class SuspendIn(BaseModel):
    disabled: bool


@api.patch("/admin/users/{uid}/suspend")
async def suspend_user(uid: str, data: SuspendIn, user: dict = Depends(require_roles(Role.admin))):
    await db.users.update_one({"_id": oid(uid)}, {"$set": {"disabled": data.disabled}})
    return {"ok": True}


@api.get("/admin/bookings")
async def admin_bookings(user: dict = Depends(require_roles(Role.admin))):
    bookings = await db.bookings.find().sort("created_at", -1).to_list(300)
    return [await enrich_booking(b) for b in bookings]


class CommissionIn(BaseModel):
    commission_pct: float = Field(ge=0, le=50)


@api.patch("/admin/settings/commission")
async def set_commission(data: CommissionIn, user: dict = Depends(require_roles(Role.admin))):
    await db.settings.update_one({"_id": "platform"}, {"$set": {"commission_pct": data.commission_pct}}, upsert=True)
    return {"commission_pct": data.commission_pct}


# ----------------------- App wiring -----------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await db.settings.update_one({"_id": "platform"}, {"$setOnInsert": {"commission_pct": 10}}, upsert=True)
        await seed()
        storage.init_storage()
        logger.info("FixIt startup complete")
    except Exception:
        logger.exception("startup error")


@app.on_event("shutdown")
async def on_shutdown():
    from database import client
    client.close()
