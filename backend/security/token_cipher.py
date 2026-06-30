"""Fernet encryption for OAuth tokens at rest."""
from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


class TokenCipherError(ValueError):
    """Invalid or missing encryption key material."""


def parse_fernet_key(key_material: str) -> bytes:
    material = key_material.strip()
    if not material:
        raise TokenCipherError("TOKEN_ENCRYPTION_KEY is required")
    try:
        Fernet(material.encode("ascii"))
    except (ValueError, TypeError) as exc:
        raise TokenCipherError(
            "TOKEN_ENCRYPTION_KEY must be a valid Fernet key "
            "(generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\" "
            "or openssl rand -base64 32)"
        ) from exc
    return material.encode("ascii")


@lru_cache(maxsize=4)
def get_token_cipher(key_material: str) -> TokenCipher:
    return TokenCipher(parse_fernet_key(key_material))


class TokenCipher:
    def __init__(self, fernet_key: bytes) -> None:
        self._fernet = Fernet(fernet_key)

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("ascii")

    def decrypt(self, token: str) -> str:
        try:
            return self._fernet.decrypt(token.encode("ascii")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("invalid or corrupted token ciphertext") from exc
