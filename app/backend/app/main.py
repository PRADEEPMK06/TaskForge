from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.responses import PlainTextResponse

from app.core.config import settings
from app.database import Base, engine, get_db
from app.models import Task, User
from app.routers import auth, tasks, users


@asynccontextmanager
async def lifespan(_application: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.project_name,
        version="1.0.0",
        description="TaskForge is a portfolio-ready task manager API with auth, task workflow, metrics, and DevOps support.",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"message": "TaskForge API is running", "service": "taskforge-api"}

    @application.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "taskforge-api"}

    @application.get("/metrics", response_class=PlainTextResponse, tags=["system"])
    def metrics(db: Session = Depends(get_db)) -> str:
        user_count = db.query(User).count()
        task_count = db.query(Task).count()
        completed_count = db.query(Task).filter(Task.status == "done").count()
        return "\n".join(
            [
                "# HELP taskforge_users_total Registered users.",
                "# TYPE taskforge_users_total gauge",
                f"taskforge_users_total {user_count}",
                "# HELP taskforge_tasks_total Tasks created.",
                "# TYPE taskforge_tasks_total gauge",
                f"taskforge_tasks_total {task_count}",
                "# HELP taskforge_tasks_completed_total Tasks completed.",
                "# TYPE taskforge_tasks_completed_total gauge",
                f"taskforge_tasks_completed_total {completed_count}",
                "",
            ]
        )

    application.include_router(auth.router, prefix=settings.api_prefix)
    application.include_router(users.router, prefix=settings.api_prefix)
    application.include_router(tasks.router, prefix=settings.api_prefix)
    return application


app = create_app()
