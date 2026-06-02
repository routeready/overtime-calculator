import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from backend.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Send a transactional email. Returns True on success, False on failure."""
    if not settings.smtp_host:
        logger.warning("SMTP not configured — skipping email to %s: %s", to, subject)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        return True
    except Exception as exc:
        logger.exception("Failed to send email to %s: %s", to, exc)
        return False


async def send_verification_email(to: str, token: str, base_url: str) -> bool:
    link = f"{base_url}/auth/verify-email?token={token}"
    html = f"""
    <p>Welcome to Mining Bible!</p>
    <p>Click the link below to verify your email address:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 24 hours.</p>
    """
    return await send_email(to, "Verify your Mining Bible email", html)


async def send_password_reset_email(to: str, token: str, base_url: str) -> bool:
    link = f"{base_url}/auth/reset-password?token={token}"
    html = f"""
    <p>You requested a password reset for your Mining Bible account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    """
    return await send_email(to, "Reset your Mining Bible password", html)
