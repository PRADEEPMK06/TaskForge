from app.models import Task, User


def test_create_task(client, auth_headers):
    response = client.post(
        "/api/v1/tasks",
        headers=auth_headers,
        json={
            "title": "Ship portfolio project",
            "description": "Finish README and DevOps folders",
            "priority": "high",
            "points_reward": 25,
        },
    )

    assert response.status_code == 201
    task = response.json()
    assert task["title"] == "Ship portfolio project"
    assert task["status"] == "todo"
    assert task["priority"] == "high"
    assert task["points_awarded"] is False


def test_list_only_current_user_tasks(client, auth_headers, db_session, test_user):
    other_user = User(username="otheruser", password_hash="hash")
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)
    db_session.add(Task(title="Hidden task", owner_id=other_user.id))
    db_session.add(Task(title="Visible task", owner_id=test_user.id))
    db_session.commit()

    response = client.get("/api/v1/tasks", headers=auth_headers)

    assert response.status_code == 200
    titles = [task["title"] for task in response.json()]
    assert titles == ["Visible task"]


def test_filter_tasks_by_status(client, auth_headers, db_session, test_user):
    db_session.add(Task(title="Todo item", status="todo", owner_id=test_user.id))
    db_session.add(Task(title="Done item", status="done", owner_id=test_user.id))
    db_session.commit()

    response = client.get("/api/v1/tasks?status=done", headers=auth_headers)

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Done item"


def test_update_task_awards_points_once(client, auth_headers, db_session, test_user, test_task):
    initial_points = test_user.points

    first = client.patch(
        f"/api/v1/tasks/{test_task.id}",
        headers=auth_headers,
        json={"status": "done"},
    )
    second = client.patch(
        f"/api/v1/tasks/{test_task.id}",
        headers=auth_headers,
        json={"status": "done"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    db_session.refresh(test_user)
    assert test_user.points == initial_points + test_task.points_reward
    assert test_user.tasks_completed == 1


def test_update_missing_task_returns_404(client, auth_headers):
    response = client.patch("/api/v1/tasks/999", headers=auth_headers, json={"status": "done"})
    assert response.status_code == 404


def test_delete_task(client, auth_headers, db_session, test_task):
    response = client.delete(f"/api/v1/tasks/{test_task.id}", headers=auth_headers)

    assert response.status_code == 204
    assert db_session.query(Task).filter(Task.id == test_task.id).first() is None


def test_task_stats(client, auth_headers, db_session, test_user):
    db_session.add(Task(title="First", status="todo", points_reward=5, owner_id=test_user.id))
    db_session.add(Task(title="Second", status="done", points_reward=10, points_awarded=True, owner_id=test_user.id))
    db_session.commit()

    response = client.get("/api/v1/tasks/summary/stats", headers=auth_headers)

    assert response.status_code == 200
    stats = response.json()
    assert stats["total"] == 2
    assert stats["todo"] == 1
    assert stats["done"] == 1
    assert stats["completion_rate"] == 50.0
    assert stats["points_available"] == 5

