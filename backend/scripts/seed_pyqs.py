"""
seed_pyqs.py - Extract PYQs from GATE DS 2024 PDF and seed them to Supabase.
"""

import os
import sys
import json
import logging
from pathlib import Path
import fitz  # PyMuPDF
from pydantic import BaseModel, Field

# Add backend directory to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from supabase import create_client
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

PDF_PATH = r"d:\gate-da-platform\1.pdf"

class MCQOption(BaseModel):
    id: str
    text: str
    latex: str | None = None

class MCQCreate(BaseModel):
    subject: str = Field(description="Must be one of: Mathematics, Statistics, Machine Learning, Deep Learning, Data Science, Programming, Linear Algebra, Probability, Algorithms, Databases, Mixed")
    topic: str
    question: str
    options: list[MCQOption]
    answer: str = Field(description="a, b, c, or d")
    explanation: str
    difficulty: str = Field(description="Easy, Medium, or Hard")
    source_type: str = "PYQ"
    year: int = 2024
    tags: list[str] = []

class ExtractedQuestions(BaseModel):
    questions: list[MCQCreate]

def run_seed():
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)
        
    if not GROQ_API_KEY:
        log.error("❌ GROQ_API_KEY must be set in .env")
        sys.exit(1)

    log.info("🔗 Connecting to Supabase...")
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    log.info("🤖 Initializing Groq...")
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=GROQ_API_KEY,
        temperature=0.1
    )

    log.info(f"📄 Reading PDF: {PDF_PATH}")
    try:
        doc = fitz.open(PDF_PATH)
    except Exception as e:
        log.error(f"Failed to open PDF: {e}")
        sys.exit(1)

    # Process 2 pages at a time to keep JSON extraction manageable and within output token limits
    chunk_size = 2
    total_pages = len(doc)
    
    all_extracted = []
    
    system_prompt = """You are an expert AI tutor. Your task is to extract all the multiple choice and multiple select questions from the given text chunks of the GATE 2024 Data Science (DA) paper.
    
    Instructions:
    1. Identify all questions. Note that the correct answer is marked with a '[✓]' in the text.
    2. Format the options precisely. Ensure each question has EXACTLY 4 options (a, b, c, d).
    3. Determine the correct answer ('a', 'b', 'c', or 'd') based on the '[✓]'.
    4. Provide a HIGH-QUALITY, detailed, educational explanation for why the answer is correct. (Since the text lacks explanations, you must generate a perfect one using your knowledge).
    5. Subject mapping: Map General Aptitude questions to 'Mixed'. Map technical questions to the best matching subject: 'Mathematics', 'Statistics', 'Machine Learning', 'Deep Learning', 'Data Science', 'Programming', 'Linear Algebra', 'Probability', 'Algorithms', 'Databases'.
    6. Difficulty: Estimate as 'Easy', 'Medium', or 'Hard'.
    7. Exclude NAT (Numerical Answer Type) questions that do not have 4 options. Only extract questions with options.
    8. Use proper LaTeX for math (e.g. $\\sum x_i$) if needed.
    
    Return ONLY a JSON array of objects. Do not include markdown code blocks. Each object MUST have this EXACT structure:
    {
        "subject": "Mixed",
        "topic": "topic name",
        "question": "question text",
        "options": [
            {"id": "a", "text": "option A text"},
            {"id": "b", "text": "option B text"},
            {"id": "c", "text": "option C text"},
            {"id": "d", "text": "option D text"}
        ],
        "answer": "b",
        "explanation": "Detailed explanation...",
        "difficulty": "Medium",
        "source_type": "PYQ",
        "year": 2024,
        "tags": ["tag1", "tag2"]
    }
    """

    for i in range(0, total_pages, chunk_size):
        pages_text = ""
        for j in range(i, min(i + chunk_size, total_pages)):
            pages_text += f"\n--- Page {j+1} ---\n"
            pages_text += doc[j].get_text("text")
            
        log.info(f"⏳ Processing pages {i+1} to {min(i + chunk_size, total_pages)} / {total_pages}...")
        
        try:
            result = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=pages_text)
            ])
            
            raw_text = result.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            try:
                extracted = json.loads(raw_text)
                log.info(f"   ✅ Extracted {len(extracted)} questions from this chunk.")
                all_extracted.extend(extracted)
            except json.JSONDecodeError as je:
                log.error(f"   ⚠ Failed to parse JSON: {je}. Raw output: {raw_text[:200]}")
                
        except Exception as e:
            log.error(f"   ❌ Failed to process chunk: {e}")

    log.info(f"🎉 Extraction complete! Total questions extracted: {len(all_extracted)}")
    
    if not all_extracted:
        log.error("No questions extracted. Exiting.")
        sys.exit(1)
        
    log.info("💾 Inserting into Supabase...")
    inserted_count = 0
    for q in all_extracted:
        try:
            db.table("mcqs").insert(q).execute()
            inserted_count += 1
        except Exception as e:
            log.error(f"Failed to insert question: {q.get('question', '')[:50]}... Error: {e}")
            
    log.info(f"✅ Successfully inserted {inserted_count} / {len(all_extracted)} questions into Supabase.")

if __name__ == "__main__":
    run_seed()
