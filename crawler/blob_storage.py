"""
Vercel Blob Storage Client
===========================
Uploads crawled images to Vercel Blob so they get a permanent, publicly
reachable URL, instead of storing the original third-party URL directly in
the database.

Why this exists
----------------
The previous image pipeline (image_storage.py) downloaded an image purely to
score its quality, then discarded the bytes and saved the *original* external
URL into logo_url / hero_image_url. That has three problems in production:

  1. Hotlinking: the image lives on someone else's server. If that server
     goes down, blocks hotlinking, or the page is restructured, the image on
     our own site breaks with no action on our side.
  2. No control over format or compression.
  3. A separate, now-abandoned attempt (image_storage.py) wrote files to a
     local "stored_images/" folder on disk. The crawler runs on a laptop, not
     on Vercel, and Vercel's filesystem is ephemeral and read-only at runtime
     anyway, so that path could never have reached the live site.

Vercel Blob solves this: it is reachable over plain HTTPS with a bearer
token, so a Python crawler can use it with no Node SDK and no local disk
involved. Images we upload live at a stable
https://<store>.public.blob.vercel-storage.com/... URL that doesn't depend on
the source site staying up.

Authentication
--------------
Requires BLOB_READ_WRITE_TOKEN, which is already present in Vercel's
Production/Preview/Development environment for the backend project (added
when the store was created) and in backend/.env.local for local runs.

REST contract (verified against the live store on 2026-10-15):
    PUT  https://blob.vercel-storage.com/<pathname>
         Authorization: Bearer <token>
         x-api-version: 7
         x-content-type: <mime type>
         body: raw bytes
    ->   200 {"url": "...", "downloadUrl": "...", "pathname": "...", ...}

    POST https://blob.vercel-storage.com/delete
         Authorization: Bearer <token>
         x-api-version: 7
         Content-Type: application/json
         body: {"urls": ["..."]}
    ->   200 null

Vercel appends a short random suffix to the filename to guarantee
uniqueness, so the returned url is not simply "https://.../<pathname>" and
must always be read from the response rather than constructed locally.
"""

import os
import logging
import mimetypes
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger(__name__)

BLOB_API_BASE = "https://blob.vercel-storage.com"
BLOB_API_VERSION = "7"


def _load_token_from_env_file(path: Path) -> Optional[str]:
    """Fall back to reading backend/.env.local when the token is not already
    exported into the environment, which is the normal case for a locally
    run crawler that was never pointed at `vercel env pull`."""
    if not path.exists():
        return None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("BLOB_READ_WRITE_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def get_blob_token() -> str:
    token = os.getenv("BLOB_READ_WRITE_TOKEN")
    if token:
        return token

    # crawler/ sits next to backend/ in the repo root.
    fallback_path = Path(__file__).resolve().parent.parent / "backend" / ".env.local"
    token = _load_token_from_env_file(fallback_path)
    if token:
        return token

    raise RuntimeError(
        "BLOB_READ_WRITE_TOKEN is not set and backend/.env.local was not found. "
        "Run `vercel env pull .env.local` inside backend/, or export the "
        "token directly."
    )


class BlobStorage:
    """Thin client over the Vercel Blob REST API."""

    def __init__(self, token: Optional[str] = None, timeout: int = 30):
        self.token = token or get_blob_token()
        self.timeout = timeout
        self.session = requests.Session()

    def upload(self, pathname: str, data: bytes, content_type: str) -> Optional[dict]:
        """
        Upload bytes to Blob storage.

        pathname: desired path, e.g. "universities/university-of-ibadan/logo.jpg".
                  Vercel appends a random suffix to the filename for
                  uniqueness, so the actual stored URL (returned here) will
                  differ slightly from this pathname.
        Returns the parsed JSON response (containing 'url') on success, or
        None on failure. Never raises for a failed upload, since image
        enrichment is best-effort and one failed image must not abort an
        otherwise successful crawl.
        """
        headers = {
            "Authorization": f"Bearer {self.token}",
            "x-api-version": BLOB_API_VERSION,
            "x-content-type": content_type,
        }

        try:
            response = self.session.put(
                f"{BLOB_API_BASE}/{pathname}",
                headers=headers,
                data=data,
                timeout=self.timeout,
            )
            if response.status_code != 200:
                logger.warning(
                    f"Blob upload failed ({response.status_code}) for {pathname}: "
                    f"{response.text[:200]}"
                )
                return None
            return response.json()
        except requests.RequestException as exc:
            logger.warning(f"Blob upload error for {pathname}: {exc}")
            return None

    def delete(self, urls: list) -> bool:
        """Delete one or more blobs by their full URL. Best-effort."""
        if not urls:
            return True

        headers = {
            "Authorization": f"Bearer {self.token}",
            "x-api-version": BLOB_API_VERSION,
            "Content-Type": "application/json",
        }

        try:
            response = self.session.post(
                f"{BLOB_API_BASE}/delete",
                headers=headers,
                json={"urls": urls},
                timeout=self.timeout,
            )
            return response.status_code == 200
        except requests.RequestException as exc:
            logger.warning(f"Blob delete error: {exc}")
            return False


def guess_content_type(url: str, fallback: str = "image/jpeg") -> str:
    """Best-effort content type from a URL's extension."""
    content_type, _ = mimetypes.guess_type(url)
    return content_type or fallback


def build_pathname(niche: str, slug: str, image_type: str, extension: str) -> str:
    """
    Build a stable, human-readable Blob pathname.

    Namespacing by niche (university, school, hospital, ...) keeps the store
    organised as more verticals are added, and mirrors the institution's own
    slug so the stored path is self-describing when browsing the store
    directly in the Vercel dashboard.
    """
    extension = extension.lstrip(".").lower() or "jpg"
    return f"{niche}/{slug}/{image_type}.{extension}"


# Module-level singleton, created lazily so importing this file does not
# require the token to be present (useful for the test suite).
_default_client: Optional[BlobStorage] = None


def get_default_client() -> BlobStorage:
    global _default_client
    if _default_client is None:
        _default_client = BlobStorage()
    return _default_client
