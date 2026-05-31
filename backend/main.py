from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

app = FastAPI()

# Allow React frontend to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_error = None
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    import traceback
    db_error = str(e)
    print("Database connection failed during startup:")
    traceback.print_exc()

@app.get("/")
def root():
    return {"message": "AI Interview App is running!"}

@app.get("/health")
def health():
    if db_error:
        return {"status": "database_error", "details": db_error}
    return {"status": "ok"}