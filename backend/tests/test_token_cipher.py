"""Fernet token cipher round-trip and key handling."""
from __future__ import annotations

import pytest
from cryptography.fernet import Fernet

from security.token_cipher import TokenCipherError, get_token_cipher, parse_fernet_key


def test_encrypt_decrypt_roundtrip():
    key = Fernet.generate_key().decode("ascii")
    cipher = get_token_cipher(key)
    assert cipher.decrypt(cipher.encrypt("refresh-token-abc")) == "refresh-token-abc"


def test_rejects_empty_key():
    with pytest.raises(TokenCipherError, match="required"):
        parse_fernet_key("")


def test_rejects_invalid_key():
    with pytest.raises(TokenCipherError, match="valid Fernet key"):
        parse_fernet_key("not-a-fernet-key")


def test_decrypt_rejects_tampered_ciphertext():
    key = Fernet.generate_key().decode("ascii")
    cipher = get_token_cipher(key)
    token = cipher.encrypt("secret")
    with pytest.raises(ValueError, match="invalid or corrupted"):
        cipher.decrypt(token[:-1] + ("a" if token[-1] != "a" else "b"))
