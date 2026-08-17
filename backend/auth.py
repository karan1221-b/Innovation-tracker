"""Authentication: password hashing, JWT, and role-based dependencies."""
import os
from datetime import timedelta
from enum import Enum
from typing import Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import db, now_utc

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 30

bearer_scheme = HTTPBearer(auto_error=False)


class Role(str, Enum):
    customer = "customer"
    professional = "professional"
    admin = "admin"


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    claims = {
        "sub": user_id,
        "role": role,
        "iat": now_utc(),
        "exp": now_utc() + timedelta(days=ACCESS_TOKEN_DAYS),
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


async def _user_from_token(token: str) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please sign in again.",
    )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise unauthorized
    except jwt.PyJWTError:
        raise unauthorized
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("disabled", False):
        raise unauthorized
    return user


async def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await _user_from_token(creds.credentials)


def require_roles(*allowed: Role):
    allowed_values = {r.value for r in allowed}

    async def dependency(user: Annotated[dict, Depends(current_user)]) -> dict:
        if user["role"] not in allowed_values:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to perform this action.",
            )
        return user

    return dependency
