import pytest
from fastapi import HTTPException
from app.services.auth_service import validate_password_strength


# Password 

def test_short_password():
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("test1")
    assert exc.value.status_code == 400


def test_noLetter_Password():
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("079079079")
    assert exc.value.status_code == 400


def test_noDigit_password():
    with pytest.raises(HTTPException) as exc:
        validate_password_strength("testtesttest")
    assert exc.value.status_code == 400


def test_password_valid():
    validate_password_strength("test1234") 


# Register

def test_register_success(user):
    res = user.post("/auth/register", json={
        "full_name": "Sura Ahmad",
        "email": "Sura.ahmad96@gmail.com",
        "password": "test1234",
    })
    assert res.status_code == 201
    assert "message" in res.json()


def test_ralready_registered_email(user, suraaldamen):
    res = user.post("/auth/register", json={
        "full_name": "sura ahmad",
        "email": suraaldamen.email,
        "password": "test1234",
    })
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()


def test_invalidDomain_registration(user):
    res = user.post("/auth/register", json={
        "full_name": "Maram",
        "email": "MaramAli@hotmail.xcom",
        "password": "test1234",
    })
    assert res.status_code == 400



# Login 

def test_success_login(user, suraaldamen):
    res = user.post("/auth/login", json={
        "email": suraaldamen.email,
        "password": "test1234",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_wrongPassword_login(user, suraaldamen):
    res = user.post("/auth/login", json={
        "email": suraaldamen.email,
        "password": "test12345",
    })
    assert res.status_code == 401


def test_nonExistentEmail_login(user):
    res = user.post("/auth/login", json={
        "email": "ammar.mohammad108@gmail.com",
        "password": "test1234",
    })
    assert res.status_code == 401




# Logout

def test_logout_success(user, suraaldamen):
    login = user.post("/auth/login", json={
        "email": suraaldamen.email,
        "password": "test1234",
    })
    refresh_token = login.json()["refresh_token"]
    res = user.post("/auth/logout", json={"refresh_token": refresh_token})
    assert res.status_code == 200
