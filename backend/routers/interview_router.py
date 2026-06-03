from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
import models, ai_service
import traceback, os, requests as http_requests

router = APIRouter(prefix="/interview", tags=["interview"])

# ─── HeyGen helpers ────────────────────────────────────────────────────────────
HEYGEN_BASE = "https://api.heygen.com"

def _hg_headers():
    key = os.getenv("HEYGEN_API_KEY", "")
    return {"x-api-key": key, "Content-Type": "application/json"}


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5

class AnswerRequest(BaseModel):
    question_id: int
    answer_text: str

class ChatRequest(BaseModel):
    messages: list
    system: str = ""
    topic: str = "General"
    difficulty: str = "medium"
    turn: int = 0
    maxTurns: int = 6
    cv_text: str = ""    # Resume / CV text for personalized questions
    job_role: str = ""   # Target job role for context

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_questions(
    data: GenerateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        questions = ai_service.generate_questions(data.topic, data.difficulty, data.count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    saved = []
    for q in questions:
        question = models.Question(
            topic=data.topic,
            difficulty=data.difficulty,
            question_text=q["question"],
            created_by=current_user.id
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        saved.append({
            "id": question.id,
            "question": question.question_text,
            "hint": q.get("hint", ""),
            "difficulty": question.difficulty,
            "topic": question.topic
        })

    return {"questions": saved}


@router.post("/evaluate")
def evaluate_answer(
    data: AnswerRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    question = db.query(models.Question).filter(models.Question.id == data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    try:
        result = ai_service.evaluate_answer(
            question.question_text,
            data.answer_text,
            question.topic
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    answer = models.Answer(
        user_id=current_user.id,
        question_id=question.id,
        answer_text=data.answer_text,
        score=result["score"],
        feedback=result["feedback"]
    )
    db.add(answer)
    db.commit()

    return {
        "score": result["score"],
        "feedback": result["feedback"],
        "strengths": result["strengths"],
        "improvements": result["improvements"]
    }


@router.get("/my-answers")
def get_my_answers(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    answers = db.query(models.Answer).filter(models.Answer.user_id == current_user.id).all()
    return [
        {
            "id": a.id,
            "question_id": a.question_id,
            "score": a.score,
            "feedback": a.feedback,
            "answer": a.answer_text
        }
        for a in answers
    ]


@router.post("/chat")
def interview_chat(
    data: ChatRequest,
    current_user=Depends(get_current_user)
):
    try:
        result = ai_service.conversational_turn(
            messages=data.messages,
            system=data.system,
            topic=data.topic,
            difficulty=data.difficulty,
            turn=data.turn,
            max_turns=data.maxTurns,
            cv_text=data.cv_text,
            job_role=data.job_role,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Transcribe audio using Groq Whisper — replaces unreliable browser STT."""
    audio_bytes = await file.read()

    if len(audio_bytes) < 500:
        raise HTTPException(
            status_code=400,
            detail="Audio too short or empty. Please speak for at least 1 second."
        )

    try:
        transcript = ai_service.transcribe_audio(
            audio_bytes,
            file.filename or "audio.webm"
        )

        return {
            "transcript": transcript
        }

    except Exception as e:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported"
            )

        pdf_bytes = await file.read()

        cv_text = ai_service.parse_cv_pdf(pdf_bytes)

        return {
            "cv_text": cv_text,
            "characters": len(cv_text)
        }

    except Exception as e:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ─── HeyGen Streaming Avatar Proxy ────────────────────────────────────────────

@router.post("/heygen/new")
async def heygen_new_session(current_user=Depends(get_current_user)):
    """Get a short-lived HeyGen streaming token for the frontend SDK."""
    try:
        resp = http_requests.post(
            f"{HEYGEN_BASE}/v1/streaming.create_token",
            headers=_hg_headers(),
            timeout=15,
        )
        data = resp.json()
        token = data.get("data", {}).get("token") if isinstance(data.get("data"), dict) else None
        if not token:
            raise HTTPException(
                status_code=502,
                detail=f"HeyGen token creation failed (HTTP {resp.status_code}): {data}"
            )
        return {"token": token}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"HeyGen connection error: {e}")


@router.post("/heygen/start")
async def heygen_start_session(payload: dict, current_user=Depends(get_current_user)):
    """Send the WebRTC SDP answer back to HeyGen to complete the handshake."""
    try:
        resp = http_requests.post(
            f"{HEYGEN_BASE}/v1/streaming.start",
            headers=_hg_headers(),
            json=payload,
            timeout=15,
        )
        return resp.json()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"HeyGen error: {e}")


@router.post("/heygen/task")
async def heygen_task(payload: dict, current_user=Depends(get_current_user)):
    """Send text for the avatar to speak (lip-synced)."""
    try:
        resp = http_requests.post(
            f"{HEYGEN_BASE}/v1/streaming.task",
            headers=_hg_headers(),
            json=payload,
            timeout=15,
        )
        return resp.json()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"HeyGen error: {e}")


@router.post("/heygen/stop")
async def heygen_stop_session(payload: dict, current_user=Depends(get_current_user)):
    """Terminate the HeyGen streaming session."""
    try:
        resp = http_requests.post(
            f"{HEYGEN_BASE}/v1/streaming.stop",
            headers=_hg_headers(),
            json=payload,
            timeout=10,
        )
        return resp.json()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"HeyGen error: {e}")