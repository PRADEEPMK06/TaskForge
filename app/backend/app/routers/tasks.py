from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Task, User, utc_now
from app.schemas import TASK_STATUSES, TaskCreate, TaskRead, TaskStats, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _owned_task_or_404(task_id: int, user: User, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.owner_id == user.id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Task]:
    if status_filter is not None and status_filter not in TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid task status filter")

    query = db.query(Task).filter(Task.owner_id == current_user.id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    task = Task(**payload.model_dump(), owner_id=current_user.id)
    if task.status == "done":
        task.points_awarded = True
        task.completed_at = utc_now()
        current_user.points += task.points_reward
        current_user.tasks_completed += 1

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/summary/stats", response_model=TaskStats)
def task_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskStats:
    tasks = db.query(Task).filter(Task.owner_id == current_user.id).all()
    total = len(tasks)
    done = len([task for task in tasks if task.status == "done"])
    todo = len([task for task in tasks if task.status == "todo"])
    in_progress = len([task for task in tasks if task.status == "in_progress"])
    points_available = sum(task.points_reward for task in tasks if not task.points_awarded)
    completion_rate = round((done / total) * 100, 2) if total else 0.0
    return TaskStats(
        total=total,
        todo=todo,
        in_progress=in_progress,
        done=done,
        completion_rate=completion_rate,
        points_available=points_available,
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    return _owned_task_or_404(task_id, current_user, db)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    task = _owned_task_or_404(task_id, current_user, db)
    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(task, field, value)

    if task.status == "done" and not task.points_awarded:
        task.points_awarded = True
        task.completed_at = utc_now()
        current_user.points += task.points_reward
        current_user.tasks_completed += 1

    task.updated_at = utc_now()
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskRead)
def replace_task(
    task_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    return update_task(task_id, TaskUpdate(**payload.model_dump()), current_user, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    task = _owned_task_or_404(task_id, current_user, db)
    db.delete(task)
    db.commit()
