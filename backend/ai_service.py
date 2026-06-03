from groq import Groq
from dotenv import load_dotenv
import json, re, os, io

# Optional: pypdf for PDF text extraction
try:
    from pypdf import PdfReader as _PdfReader
    _PYPDF_OK = True
except ImportError:
    _PYPDF_OK = False

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL  = "llama-3.3-70b-versatile"


# ─── Question generation ───────────────────────────────────────────────────────

def generate_questions(topic: str, difficulty: str, count: int = 5):
    prompt = f"""You are an expert technical interviewer.
Generate {count} interview questions on the topic: "{topic}"
Difficulty level: {difficulty}

Respond ONLY with a valid JSON array, no explanation, no markdown, no code fences:
[
  {{"question": "What is X?", "hint": "Think about Y"}}
]"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.7,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── Answer evaluation ─────────────────────────────────────────────────────────

def evaluate_answer(question: str, answer: str, topic: str):
    prompt = f"""You are an expert technical interviewer evaluating a candidate's answer.

Topic: {topic}
Question: {question}
Candidate's Answer: {answer}

Respond ONLY with a valid JSON object, no explanation, no markdown, no code fences:
{{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentences of constructive feedback>",
  "strengths": "<what they did well>",
  "improvements": "<what they should improve>"
}}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.7,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ─── PDF CV parsing ─────────────────────────────────────────────────────────────

def parse_cv_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF resume.
    Requires: pip install pypdf
    """
    if not _PYPDF_OK:
        raise RuntimeError(
            "pypdf is not installed. "
            "Run: pip install pypdf   (in your backend venv)"
        )
    reader = _PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    full = "\n".join(pages).strip()
    if not full:
        raise ValueError("Could not extract text from PDF. Try copy-pasting your CV instead.")
    return full


# ─── Audio transcription via Groq Whisper ─────────────────────────────────────

def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes using Groq Whisper-large-v3-turbo."""
    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes, "audio/webm"),
        model="whisper-large-v3-turbo",
        response_format="text",
        language="en",
    )
    return str(transcription).strip()


# ─── Conversational interview turn ────────────────────────────────────────────

def conversational_turn(
    messages,
    system,
    topic,
    difficulty,
    turn,
    max_turns,
    cv_text: str = "",
    job_role: str = "",
):
    is_last_turn = turn >= max_turns - 1

    if not system:
        role_line = (
            f"The candidate is interviewing for: **{job_role}**\n"
            if job_role else ""
        )

        if cv_text:
            context_block = f"""
The candidate's resume / CV (use this to craft targeted questions):
---
{cv_text[:4000]}
---
Focus on:
• Specific technologies and skills listed
• Projects and accomplishments mentioned
• Any gaps or areas to probe deeper
• Claimed expertise worth verifying
"""
        else:
            context_block = f"Interview topics: {topic}\n"

        system = f"""You are Alex, a Senior Software Engineer conducting a realistic technical interview.

Candidate Target Role: {job_role or "Software Engineer"}
Difficulty: {difficulty}

{context_block}

INTERVIEW GOALS:
- Assess technical knowledge
- Assess communication skills
- Verify resume claims
- Evaluate problem-solving ability
- Discover strengths and weaknesses

INTERVIEW RULES:
1. Start with a warm introduction and ask the candidate to introduce themselves.
2. Ask ONE question per turn — never multiple at once.
3. Ask follow-up questions when answers are vague or incomplete.
4. Challenge weak answers respectfully.
5. Increase difficulty when answers are strong.
6. Dive deeply into resume projects and claimed experience.
7. Sound like a real human interviewer — warm, professional, conversational.
8. Do NOT reveal you are an AI unless directly asked.
9. Only end the interview when you have enough evidence to evaluate all scoring areas.

ENDING THE INTERVIEW:
When you have enough information to confidently score the candidate, close warmly and output the JSON inside <REPORT>...</REPORT> tags.

Report JSON format (output ONLY when ending the interview):
<REPORT>
{{"overallScore": 0, "summary": "2-3 sentence assessment", "strengths": ["..."], "improvements": ["..."], "topicScores": {{"technical_knowledge": 0, "problem_solving": 0, "communication": 0}}}}
</REPORT>

Do NOT output <REPORT> until you are confident in your evaluation.
"""

    # Build Groq message list
    groq_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
        if m.get("role") in ("user", "assistant")
    ]

    if not groq_messages:
        # First turn — kick off the intro
        groq_messages = [{"role": "user", "content": "Please begin the interview."}]
    elif is_last_turn:
        groq_messages.append({
            "role": "user",
            "content": (
                "You have reached the safety limit. "
                "Finish the interview and generate the final report "
                "inside <REPORT></REPORT>."
            ),
        })

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "system", "content": system}] + groq_messages,
        max_tokens=900,
        temperature=0.75,
    )

    content = response.choices[0].message.content.strip()

    # Extract final report if present
    report_match = re.search(r"<REPORT>(.*?)</REPORT>", content, re.DOTALL)
    if report_match:
        try:
            report = json.loads(report_match.group(1).strip())
            spoken = re.sub(r"<REPORT>.*?</REPORT>", "", content, flags=re.DOTALL).strip()
            return {
                "question": spoken or "Thank you for completing the interview!",
                "is_final": True,
                "report": report,
            }
        except Exception:
            pass

    return {"question": content, "is_final": False, "report": None}