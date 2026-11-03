import json  #to convert a Python dict into a JSON string before sending it over HTTP( Brevo API expects a JSON body)
import logging
import urllib.request #library that deals with Brevo( http)
from app.core.config import settings

logger = logging.getLogger(__name__)

_HTML_TEMPLATE = """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1E2A4A; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Requirements Super Tool</h1>
    </div>
    <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1E2A4A; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #374151;">Hi {full_name},</p>
        <p style="color: #374151;">We received a request to reset the password for your account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_link}"
               style="background: #FF6B6B; color: white; padding: 14px 32px; border-radius: 50px;
                      text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Reset Password
            </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If the button above doesn't work, copy and paste this URL into your browser:<br />
            <a href="{reset_link}" style="color: #6b7280; word-break: break-all;">{reset_link}</a>
        </p>
    </div>
</body>
</html>
"""


_VERIFY_HTML_TEMPLATE = """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #1E2A4A; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Requirements Super Tool</h1>
    </div>
    <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1E2A4A; margin-top: 0;">Verify Your Email</h2>
        <p style="color: #374151;">Hi {full_name},</p>
        <p style="color: #374151;">Thank you for registering. Click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verify_link}"
               style="background: #FF6B6B; color: white; padding: 14px 32px; border-radius: 50px;
                      text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Verify Email
            </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If the button above doesn't work, copy and paste this URL into your browser:<br />
            <a href="{verify_link}" style="color: #6b7280; word-break: break-all;">{verify_link}</a>
        </p>
    </div>
</body>
</html>
"""


def send_verification_email(to_email: str, full_name: str, verify_link: str) -> None:
    if not settings.BREVO_API_KEY:
        logger.warning
        (
            "Email not sent, Brevo key missing — verification link for %s: %s",to_email,verify_link,
        )
        return

    html_body = _VERIFY_HTML_TEMPLATE.format(full_name=full_name, verify_link=verify_link)
    payload = json.dumps({
        "sender": {"name": "Requirements Super Tool", "email": settings.SMTP_FROM or "noreply@requirementstool.com"},
        "to": [{"email": to_email}],
        "subject": "Verify Your Email — Requirements Super Tool",
        "htmlContent": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            response.read()
        logger.info("Verification email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", to_email, exc, exc_info=True)


def send_reset_email(to_email: str, full_name: str, reset_link: str) -> None:
    if not settings.BREVO_API_KEY:
        logger.warning(
            "Brevo key missing — password reset link for %s: %s",
            to_email,
            reset_link,
        )
        return

    html_body = _HTML_TEMPLATE.format(full_name=full_name, reset_link=reset_link)
    payload = json.dumps({
        "sender": {"name": "Requirements Super Tool", "email": settings.SMTP_FROM},
        "to": [{"email": to_email}],
        "subject": "Reset Your Password — Requirements Super Tool",
        "htmlContent": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            response.read()
        logger.info("Password reset email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc, exc_info=True)
