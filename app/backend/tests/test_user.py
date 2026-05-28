def test_update_user_settings(client, auth_headers):
    response = client.patch(
        "/api/v1/users/me/settings",
        headers=auth_headers,
        json={"theme_color": "#0f766e", "font_style": "System"},
    )

    assert response.status_code == 200
    assert response.json()["theme_color"] == "#0f766e"
    assert response.json()["font_style"] == "System"


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_metrics_endpoint(client, db_session, test_user):
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "taskflow_users_total" in response.text
    assert "taskflow_tasks_total" in response.text
