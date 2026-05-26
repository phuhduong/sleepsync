"""Encrypt OAuth refresh tokens at rest (demo-grade; swap for Fernet/KMS in production)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from functools import lru_cache


_DEV_FALLBACK_KEY = "sleepsync-dev-do-not-use-in-production"


@lru_cache(maxsize=4)
def get_token_cipher(key_material: str) -> TokenCipher:
    return TokenCipher(key_material or _DEV_FALLBACK_KEY)


class TokenCipher:
    def __init__(self, key_material: str) -> None:
        self._key = hashlib.sha256(key_material.encode("utf-8")).digest()

    def encrypt(self, plaintext: str) -> str:
        nonce = secrets.token_bytes(16)
        stream = _keystream(self._key, nonce, len(plaintext.encode()))
        ct = bytes(a ^ b for a, b in zip(plaintext.encode(), stream, strict=True))
        mac = hmac.new(self._key, nonce + ct, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(nonce + ct + mac).decode("ascii")

    def decrypt(self, token: str) -> str:
        raw = base64.urlsafe_b64decode(token.encode("ascii"))
        nonce, ct, mac = raw[:16], raw[16:-32], raw[-32:]
        expected = hmac.new(self._key, nonce + ct, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected):
            raise ValueError("token MAC mismatch")
        stream = _keystream(self._key, nonce, len(ct))
        return bytes(a ^ b for a, b in zip(ct, stream, strict=True)).decode("utf-8")


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < length:
        block = hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest()
        out.extend(block)
        counter += 1
    return bytes(out[:length])
