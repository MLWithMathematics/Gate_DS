"""
seed_pyq_2024.py - Parses GATE DA 2024 PYQ from PDF using Gemini 2.5 Flash, 
deduplicates against existing questions, and uploads to Supabase
"""

import os
import sys
import json
import logging
import time
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from supabase import create_client
import google.generativeai as genai

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def parse_pyq_pdf_gemini(pdf_path):
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        log.error("GOOGLE_API_KEY not found in .env")
        return []

    genai.configure(api_key=google_api_key)
    
    log.info("Uploading PDF to Gemini...")
    pdf_file = genai.upload_file(pdf_path, mime_type="application/pdf")
    log.info(f"PDF uploaded: {pdf_file.uri}")
    
    while pdf_file.state.name == 'PROCESSING':
        log.info("Waiting for PDF to process...")
        time.sleep(2)
        pdf_file = genai.get_file(pdf_file.name)
        
    if pdf_file.state.name == 'FAILED':
        log.error("PDF processing failed on Gemini.")
        return []

    prompt = """
    You are an expert at parsing complex exam PDFs containing mathematics, LaTeX, and images.
    Extract ALL 65 multiple-choice questions from the provided GATE 2024 Data Science & AI exam paper.
    
    For each question, there are 4 options marked (A), (B), (C), (D).
    The correct option is usually indicated by [ ✓ ] next to it, or you may find the correct answer in the solution if it's NAT.
    If it is a Numerical Answer Type (NAT) without 4 options, create an option 'A' with the numerical answer, and mark 'a' as correct.
    
    Convert all mathematical formulas into standard LaTeX wrapped in $ or $$ delimiters.
    If a question has an image that you cannot transcribe into LaTeX, just describe the image briefly in text.
    
    Respond STRICTLY with a valid JSON array. Do not include markdown code blocks like ```json.
    
    The schema of the JSON array should be:
    [
      {
        "q_num": 1,
        "subject": "General Aptitude", // "General Aptitude" for Q1-10, "Data Science & Artificial Intelligence" for Q11-65
        "question": "(Q.1) What is...",
        "options": [
          {"id": "a", "text": "Option A text"},
          {"id": "b", "text": "Option B text"},
          {"id": "c", "text": "Option C text"},
          {"id": "d", "text": "Option D text"}
        ],
        "answer": "a" // The id ('a', 'b', 'c', or 'd') of the correct option
      },
      ...
    ]
    """

    log.info("Prompting Gemini 2.5 Flash to extract 65 questions (this may take a few minutes)...")
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    response = model.generate_content(
        [pdf_file, prompt],
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.0
        )
    )
    
    try:
        raw_text = response.text
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text.rsplit("```", 1)[0]
            
        import json_repair
        # We don't need regex replacement if we use json_repair
        questions_data = json_repair.loads(raw_text.strip())
        
        mcqs = []
        for q in questions_data:
            # Ensure "question" field is robust
            q_text = q.get("question", "")
            if "(Q." not in q_text and q.get("q_num"):
                 q_text = f"(Q.{q.get('q_num')}) {q_text}"
            
            mcq_entry = {
                "subject": q.get("subject", "Data Science & Artificial Intelligence"),
                "topic": "GATE 2024 PYQ",
                "question": q_text,
                "options": q.get("options", []),
                "answer": q.get("answer", "a"),
                "explanation": "Official GATE 2024 Answer Key",
                "difficulty": "Medium",
                "source_type": "PYQ",
                "year": 2024,
                "tags": ["PYQ", "GATE2024"]
            }
            mcqs.append(mcq_entry)
            
        return mcqs

    except json.JSONDecodeError as e:
        log.error(f"Failed to parse Gemini response as JSON: {e}")
        with open("gemini_failed_response_2024.json", "w", encoding="utf-8") as f:
            f.write(raw_text)
        return []
    except Exception as e:
        log.error(f"Error processing Gemini response: {e}")
        return []

def run_seed():
    pdf_path = r"d:\gate-da-platform\2.pdf"
    
    if not os.path.exists(pdf_path):
        log.error(f"❌ Could not find {pdf_path}")
        sys.exit(1)
        
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    log.info("🔗 Connecting to Supabase...")
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # 1. Fetch existing questions
    log.info("Fetching existing 2024 PYQs...")
    res = db.table("mcqs").select("question").eq("year", 2024).execute()
    existing_questions = [r["question"].lower() for r in res.data]
    log.info(f"Found {len(existing_questions)} existing questions.")
    
    # 2. Parse PDF
    mcqs = parse_pyq_pdf_gemini(pdf_path)
    log.info(f"✅ Gemini successfully parsed {len(mcqs)} questions.")
    
    if not mcqs:
        log.warning("No questions parsed. Exiting.")
        sys.exit(0)
    
    # 3. Deduplicate
    log.info("Deduplicating...")
    new_mcqs = []
    
    for mcq in mcqs:
        is_duplicate = False
        parsed_q = mcq["question"].lower()
        # Remove (Q.x) prefix if any for better comparison
        clean_parsed = parsed_q
        if parsed_q.startswith("(q."):
            try:
                clean_parsed = parsed_q.split(")", 1)[1].strip()
            except:
                pass
                
        for eq in existing_questions:
            # Check if clean_parsed is a substring or very similar
            if clean_parsed in eq or eq in clean_parsed or similar(clean_parsed[:100], eq[:100]) > 0.8:
                is_duplicate = True
                break
                
        if not is_duplicate:
            new_mcqs.append(mcq)
            
    log.info(f"Identified {len(new_mcqs)} missing questions to insert.")
    
    if not new_mcqs:
        log.info("All questions are already seeded. Exiting.")
        sys.exit(0)
        
    # 4. Insert remaining
    log.info("🚀 Inserting MCQs to Supabase...")
    
    success_count = 0
    batch_size = 10
    for i in range(0, len(new_mcqs), batch_size):
        batch = new_mcqs[i:i+batch_size]
        try:
            res = db.table("mcqs").insert(batch).execute()
            if res.data:
                success_count += len(res.data)
                log.info(f"  Inserted batch {i//batch_size + 1} ({len(res.data)} items)")
            else:
                log.warning(f"  Failed to insert batch {i//batch_size + 1}")
        except Exception as e:
             log.error(f"  Error inserting batch {i//batch_size + 1}: {e}")
             
        time.sleep(0.1)

    log.info(f"🎉 Successfully inserted {success_count} missing PYQs to database!")

if __name__ == "__main__":
    run_seed()
