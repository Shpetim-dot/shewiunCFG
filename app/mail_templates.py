"""Transactional email: plain text plus a branded HTML alternative.

The templates are deliberately small and self-contained (no external CSS, no images): they render
in Gmail, Outlook and Apple Mail and degrade to the plain-text part. All links are built from
CFA_PUBLIC_URL so self-hosted installations can point at their own domain; tokens are only ever
placed inside the link, never in the subject.
"""
from __future__ import annotations

import html
import os
from typing import Any

BRAND = "Shewiun CFA"


def public_url() -> str:
    return (os.getenv("CFA_PUBLIC_URL") or "http://localhost:8000").rstrip("/")


def _button(url: str, label: str) -> str:
    return (f'<a href="{html.escape(url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;'
            f'background:#2F5BD3;color:#ffffff;font-weight:600;text-decoration:none">{html.escape(label)}</a>')


def _layout(title: str, intro: str, body_html: str) -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#F4F6FB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0F2740">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #E2E8F5">
    <tr><td style="padding:26px 28px">
      <div style="font-size:16px;font-weight:700;letter-spacing:.2px">{BRAND}</div>
      <h1 style="font-size:20px;margin:18px 0 8px">{html.escape(title)}</h1>
      <p style="margin:0 0 16px;color:#4A5A75;line-height:1.55">{intro}</p>
      {body_html}
      <p style="margin:22px 0 0;font-size:12px;color:#7C8BA5;line-height:1.5">
        If you did not expect this email you can ignore it. {html.escape(BRAND)} never asks for your
        password by email.</p>
    </td></tr>
  </table>
</body></html>"""


def templates() -> dict[str, Any]:
    base = public_url()
    return {
        "password_reset": {
            "subject": "Reset your Shewiun password",
            "title": "Reset your password",
            "intro": "Use the button below to choose a new password. The link works once and expires in one hour.",
            "link": f"{base}/?reset={{token}}",
            "button": "Choose a new password",
        },
        "verify_email": {
            "subject": "Verify your Shewiun email",
            "title": "Confirm your email address",
            "intro": "Confirm this address so your organisation can reach you. The link expires in 24 hours.",
            "link": f"{base}/?verify={{token}}",
            "button": "Confirm email",
        },
        "invitation": {
            "subject": "You are invited to Shewiun",
            "title": "You have an invitation",
            "intro": "Someone invited you to a Shewiun workspace. Accept within 7 days to join.",
            "link": f"{base}/?invite={{token}}",
            "button": "Accept invitation",
        },
    }


def render(kind: str, token: str, needs: str = "") -> tuple[str, str, str]:
    """Return (subject, plain_text, html) for a transactional mail kind."""
    t = templates().get(kind)
    if not t:
        raise KeyError(f"unknown mail template: {kind}")
    url = t["link"].format(token=token)
    subject = t["subject"]
    text = f"{t['title']}\n\n{t['intro']}" + (f"\n\n{needs}" if needs else "") + f"\n\n{url}\n\n-- \n{BRAND}"
    body = _button(url, t["button"]) + (
        f'<p style="margin:16px 0 0;font-size:12px;color:#7C8BA5">Or paste this link into your browser:<br>'
        f'<span style="word-break:break-all">{html.escape(url)}</span></p>')
    if needs:
        body = f'<p style="margin:0 0 14px;color:#4A5A75">{html.escape(needs)}</p>' + body
    return subject, text, _layout(t["title"], t["intro"], body)
