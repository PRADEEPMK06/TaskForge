from app.models import User


def test_register_creates_user_and_token(client, db_session):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "NewUser", "password": "strongpass123"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["username"] == "newuser"
    assert payload["user"]["points"] == 100

    user = db_session.query(User).filter(User.username == "newuser").first()
    assert user is not None
    assert user.password_hash != "strongpass123"


def test_register_rejects_duplicate_username(client, test_user):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "anotherpass123"},
    )

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"]


def test_login_returns_token_for_valid_credentials(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpass123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["user"]["id"] == test_user.id


def test_login_rejects_invalid_credentials(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "wrongpass123"},
    )

    assert response.status_code == 401


def test_profile_requires_bearer_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_profile_returns_current_user(client, auth_headers, test_user):
    response = client.get("/api/v1/users/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == test_user.username

