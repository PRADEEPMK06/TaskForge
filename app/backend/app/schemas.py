from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

TASK_STATUSES = {"todo", "in_progress", "done"}
TASK_PRIORITIES = {"low", "medium", "high"}


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class UserLogin(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class UserSettingsUpdate(BaseModel):
    theme_color: str = Field(default="#2563eb", pattern=r"^#[0-9A-Fa-f]{6}$")
    font_style: str = Field(default="Inter", min_length=2, max_length=80)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    points: int
    tasks_completed: int
    theme_color: str
    font_style: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    points_reward: int = Field(default=10, ge=1, le=100)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return value.strip()

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in TASK_STATUSES:
            raise ValueError("status must be one of todo, in_progress, done")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        if value not in TASK_PRIORITIES:
            raise ValueError("priority must be one of low, medium, high")
        return value


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    points_reward: Optional[int] = Field(default=None, ge=1, le=100)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value is not None else value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in TASK_STATUSES:
            raise ValueError("status must be one of todo, in_progress, done")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in TASK_PRIORITIES:
            raise ValueError("priority must be one of low, medium, high")
        return value


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    points_reward: int
    points_awarded: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    owner_id: int


class TaskStats(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    completion_rate: float
    points_available: int

