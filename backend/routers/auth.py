from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import (
    create_access_token,
    generate_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.config import settings
from backend.database import get_db
from backend.models.user import SubscriptionStatus, User
from backend.services.email_service import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    verification_token = generate_token()
    trial_end = datetime.now(timezone.utc) + timedelta(days=settings.trial_days)

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        email_verification_token=verification_token,
        subscription_status=SubscriptionStatus.trialing,
        subscription_end_date=trial_end,
    )
    db.add(user)
    await db.flush()

    base_url = str(request.base_url).rstrip("/")
    await send_verification_email(body.email, verification_token, base_url)

    return {"message": "Registration successful. Please check your email to verify your account."}


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email_verification_token == token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.email_verified = True
    user.email_verification_token = None
    return {"message": "Email verified successfully. You can now log in."}


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.jwt_expire_minutes * 60,
    )
    return {
        "message": "Login successful",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "email_verified": user.email_verified,
            "subscription_status": user.subscription_status,
        },
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "email_verified": user.email_verified,
        "subscription_status": user.subscription_status,
        "subscription_end_date": user.subscription_end_date,
        "question_count": user.question_count,
    }


@router.post("/forgot-password")
async def forgot_password(body: PasswordResetRequest, request: Request,
                          db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if user:
        token = generate_token()
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        base_url = str(request.base_url).rstrip("/")
        await send_password_reset_email(body.email, token, base_url)

    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.password_reset_token == body.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.password_reset_expires and user.password_reset_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.password_hash = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    return {"message": "Password reset successful. You can now log in."}
