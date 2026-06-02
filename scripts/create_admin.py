#!/usr/bin/env python3
"""
Bootstrap the first admin user.

Usage:
    python scripts/create_admin.py --email admin@example.com --password yourpassword
"""
import argparse
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import AsyncSessionLocal
from backend.models.user import User, UserRole, SubscriptionStatus
from backend.auth import hash_password
from sqlalchemy import select


async def create_admin(email: str, password: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            existing.role = UserRole.admin
            existing.password_hash = hash_password(password)
            existing.email_verified = True
            existing.subscription_status = SubscriptionStatus.active
            print(f"Updated existing user {email} to admin role.")
        else:
            user = User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.admin,
                email_verified=True,
                subscription_status=SubscriptionStatus.active,
            )
            db.add(user)
            print(f"Created admin user: {email}")

        await db.commit()
        print("Done.")


def main():
    parser = argparse.ArgumentParser(description="Create or promote an admin user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)

    asyncio.run(create_admin(args.email, args.password))


if __name__ == "__main__":
    main()
