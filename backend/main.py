from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth_router, interview_router
import models

app = FastAPI()

import os

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Add the FRONTEND_URL from environment variable if it exists (for Render)
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router)
app.include_router(interview_router.router)

@app.get("/")
def root():
    return {"message": "AI Interview App is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}