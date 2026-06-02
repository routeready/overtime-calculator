import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models.user import User, SubscriptionStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


def _stripe_client():
    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.post("/checkout")
async def create_checkout_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Billing not configured")

    s = _stripe_client()
    base_url = str(request.base_url).rstrip("/")

    # Create or retrieve Stripe customer
    if not user.stripe_customer_id:
        customer = s.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
        user.stripe_customer_id = customer.id
        await db.flush()

    session = s.checkout.Session.create(
        customer=user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{base_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/billing",
        subscription_data={
            "trial_period_days": settings.trial_days,
        },
    )
    return {"checkout_url": session.url}


@router.get("/status")
async def billing_status(user: User = Depends(get_current_user)):
    return {
        "subscription_status": user.subscription_status,
        "subscription_end_date": user.subscription_end_date,
        "stripe_customer_id": user.stripe_customer_id,
    }


@router.post("/cancel")
async def cancel_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    s = _stripe_client()
    s.Subscription.modify(
        user.stripe_subscription_id,
        cancel_at_period_end=True,
    )
    return {"message": "Subscription will cancel at end of billing period."}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    payload = await request.body()
    s = _stripe_client()

    try:
        event = s.Webhook.construct_event(payload, stripe_signature, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        await _handle_checkout_completed(db, customer_id, subscription_id)

    elif event_type in ("invoice.payment_succeeded",):
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        period_end = data.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")
        await _handle_payment_succeeded(db, customer_id, subscription_id, period_end)

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        await _handle_payment_failed(db, customer_id)

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        await _handle_subscription_deleted(db, customer_id)

    return {"received": True}


async def _get_user_by_customer(db: AsyncSession, customer_id: str) -> User | None:
    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    return result.scalar_one_or_none()


async def _handle_checkout_completed(db, customer_id, subscription_id):
    user = await _get_user_by_customer(db, customer_id)
    if not user:
        logger.warning("checkout.session.completed: no user for customer %s", customer_id)
        return
    user.stripe_subscription_id = subscription_id
    user.subscription_status = SubscriptionStatus.active


async def _handle_payment_succeeded(db, customer_id, subscription_id, period_end):
    user = await _get_user_by_customer(db, customer_id)
    if not user:
        return
    user.subscription_status = SubscriptionStatus.active
    if period_end:
        user.subscription_end_date = datetime.fromtimestamp(period_end, tz=timezone.utc)


async def _handle_payment_failed(db, customer_id):
    user = await _get_user_by_customer(db, customer_id)
    if not user:
        return
    user.subscription_status = SubscriptionStatus.past_due


async def _handle_subscription_deleted(db, customer_id):
    user = await _get_user_by_customer(db, customer_id)
    if not user:
        return
    user.subscription_status = SubscriptionStatus.cancelled
