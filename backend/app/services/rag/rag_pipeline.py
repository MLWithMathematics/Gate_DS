"""
RAG Pipeline:
1. User asks doubt
2. Create embedding with sentence-transformers
3. Query pgvector in Supabase
4. Retrieve top-K chunks
5. Build contextual prompt
6. Send to Groq (fast) or Gemini (detailed)
7. Cache response
8. Stream to frontend
"""

import hashlib
import logging
from typing import AsyncGenerator

from sentence_transformers import SentenceTransformer
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.callbacks import StreamingStdOutCallbackHandler

from app.core.config import get_settings
from app.services.db.supabase_service import (
    get_similar_chunks,
    get_cached_response,
    cache_response,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize embedding model (lazy)
_embedding_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model


def get_query_embedding(text: str) -> list[float]:
    """Generate embedding for a query text."""
    model = get_embedding_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def hash_query(query: str) -> str:
    """Create deterministic hash for cache key."""
    return hashlib.sha256(query.lower().strip().encode()).hexdigest()


GATE_DA_SYSTEM_PROMPT = """You are an expert GATE DS (Data Science & Artificial Intelligence) tutor with comprehensive knowledge of:

**Core Subjects:**
- Machine Learning: supervised/unsupervised learning, SVMs, decision trees, ensemble methods, neural networks
- Deep Learning: CNNs, RNNs, LSTMs, Transformers, attention mechanisms, GANs
- Statistics: probability distributions, hypothesis testing, Bayesian statistics, regression
- Mathematics: calculus, linear algebra, optimization, graph theory
- Programming: Python, algorithms, data structures, complexity analysis
- Databases: SQL, NoSQL, normalization, query optimization

**Strict Scope Restriction:**
- You MUST ONLY answer questions related to the GATE DS syllabus, Data Science, AI, Mathematics, Programming, or general GATE preparation.
- If a user asks a question completely unrelated to these topics (e.g., general knowledge, politics, irrelevant facts), you MUST politely decline to answer and steer the conversation back to GATE DS preparation. Do NOT provide the answer to the unrelated question.

**Teaching Style:**
- Provide clear, structured explanations with numbered steps
- Use LaTeX for mathematical formulas: inline with $...$ and display with $$...$$
- Include intuitive explanations alongside formal definitions
- Reference GATE exam patterns and common question types
- Point out common mistakes and misconceptions
- Give practical examples from real ML/AI applications

**Response Format:**
- Use markdown with headers, bullet points, code blocks
- Include worked examples for numerical questions
- Highlight key formulas in LaTeX
- End with a quick summary or key takeaway
- Suggest 2-3 related follow-up topics

Always be accurate, pedagogically sound, and exam-focused."""


async def rag_answer(
    question: str,
    subject: str | None = None,
    mode: str = "detailed",
    chat_history: list[dict] | None = None,
    use_cache: bool = True,
) -> dict:
    """
    Full RAG pipeline: embed → retrieve → generate → cache
    Returns: {answer, sources, cached, model_used}
    """
    query_hash = hash_query(f"{question}:{subject}:{mode}")

    # 1. Check cache
    if use_cache:
        cached = await get_cached_response(query_hash)
        if cached:
            logger.info(f"Cache hit for query: {question[:50]}...")
            return {
                "answer": cached,
                "sources": [],
                "cached": True,
                "model_used": "cache",
            }

    # 2. Generate embedding
    try:
        embedding = get_query_embedding(question)
    except Exception as e:
        logger.warning(f"Embedding failed, using keyword search fallback: {e}")
        embedding = []

    # 3. Retrieve relevant chunks from pgvector
    context_chunks = []
    if embedding:
        try:
            chunks = await get_similar_chunks(
                embedding=embedding,
                top_k=settings.TOP_K_CHUNKS,
                subject=subject,
            )
            context_chunks = chunks
        except Exception as e:
            logger.warning(f"Vector search failed: {e}")

    # 4. Build contextual prompt
    context_text = ""
    source_ids = []
    if context_chunks:
        context_text = "\n\n**Relevant Syllabus Context:**\n"
        for i, chunk in enumerate(context_chunks[:3], 1):
            context_text += f"\n[{i}] **{chunk.get('topic', 'General')}** ({chunk.get('subject', '')}):\n{chunk.get('content', '')[:500]}\n"
            source_ids.append(chunk.get("id", f"chunk_{i}"))

    # 5. Build messages
    user_content = question
    if context_text:
        user_content = f"{context_text}\n\n**Student's Question:** {question}"

    if mode == "simple":
        user_content += "\n\nExplain this in the simplest possible way using an everyday analogy. Under 150 words."
    elif mode == "formula":
        user_content += "\n\nProvide all key formulas and mathematical relationships for GATE exam preparation."

    messages = []
    if chat_history:
        for msg in chat_history[-4:]:  # last 4 turns for context
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_content))

    # 6. Call LLM (Groq for speed)
    answer = ""
    model_used = "groq"
    try:
        llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.3,
            max_tokens=1500,
        )
        system = SystemMessage(content=GATE_DA_SYSTEM_PROMPT)
        response = await llm.ainvoke([system] + messages)
        answer = response.content
    except Exception as groq_error:
        logger.warning(f"Groq failed, falling back to Gemini: {groq_error}")
        try:
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.3,
                max_output_tokens=1500,
            )
            system = SystemMessage(content=GATE_DA_SYSTEM_PROMPT)
            response = await llm.ainvoke([system] + messages)
            answer = response.content
            model_used = "gemini"
        except Exception as gemini_error:
            logger.error(f"Both LLMs failed: {gemini_error}")
            answer = _fallback_response(question)
            model_used = "fallback"

    # 7. Cache the response
    if answer and model_used != "fallback":
        await cache_response(query_hash, answer)

    return {
        "answer": answer,
        "sources": source_ids,
        "cached": False,
        "model_used": model_used,
    }


async def rag_stream(
    question: str,
    subject: str | None = None,
    mode: str = "detailed",
    chat_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streaming RAG pipeline using Groq's fast inference.
    Yields text chunks as they are generated.
    """
    query_hash = hash_query(f"{question}:{subject}:{mode}")

    # Check cache first
    cached = await get_cached_response(query_hash)
    if cached:
        # Stream cached response word by word
        import asyncio
        for word in cached.split(" "):
            yield word + " "
            await asyncio.sleep(0.01)
        return

    # Generate embedding and retrieve context
    context_text = ""
    try:
        embedding = get_query_embedding(question)
        chunks = await get_similar_chunks(embedding=embedding, top_k=3, subject=subject)
        if chunks:
            context_text = "\n\n**Context:**\n" + "\n".join(
                f"- {c.get('topic', '')}: {c.get('content', '')[:300]}" for c in chunks
            )
    except Exception as e:
        logger.warning(f"Context retrieval failed: {e}")

    user_content = f"{context_text}\n\n{question}" if context_text else question

    # Stream from Groq
    full_response = ""
    try:
        llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.3,
            max_tokens=1500,
            streaming=True,
        )
        system = SystemMessage(content=GATE_DA_SYSTEM_PROMPT)
        async for chunk in llm.astream([system, HumanMessage(content=user_content)]):
            token = chunk.content
            if token:
                full_response += token
                yield token

        # Cache full response
        if full_response:
            await cache_response(query_hash, full_response)

    except Exception as groq_error:
        logger.warning(f"Groq streaming failed, falling back to Gemini: {groq_error}")
        try:
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.3,
                max_output_tokens=1500,
            )
            system = SystemMessage(content=GATE_DA_SYSTEM_PROMPT)
            async for chunk in llm.astream([system, HumanMessage(content=user_content)]):
                token = chunk.content
                if token:
                    full_response += token
                    yield token

            # Cache full response
            if full_response:
                await cache_response(query_hash, full_response)

        except Exception as gemini_error:
            logger.error(f"Both LLMs failed in streaming: {gemini_error}")
            fallback = _fallback_response(question)
            import asyncio
            for word in fallback.split(" "):
                yield word + " "
                await asyncio.sleep(0.02)


def _fallback_response(question: str) -> str:
    return f"""## Response Temporarily Unavailable

I'm having trouble connecting to the AI service right now. Here's what you can try:

1. **Check the documentation** for this topic in standard GATE DS textbooks
2. **Try rephrasing** your question and submitting again
3. **Browse PYQs** related to this topic in the Practice section

Your question was: *"{question[:100]}..."*

Please try again in a moment. 🙏"""


async def generate_mcqs_with_ai(
    subject: str,
    topic: str,
    difficulty: str,
    count: int = 5,
) -> list[dict]:
    """Use Gemini to generate high-quality GATE-style MCQs."""
    prompt = f"""Generate {count} GATE DS exam-style MCQ questions on "{topic}" in {subject}.

Requirements:
- Difficulty: {difficulty}
- Style: Similar to actual GATE DS exam
- Include both conceptual and numerical questions
- Each question must have exactly 4 options (a, b, c, d)
- Provide detailed explanation for the correct answer
- Use LaTeX notation for math (e.g., $\\sigma^2$)

Return ONLY a JSON array with this exact structure (no markdown, no preamble):
[
  {{
    "question": "Question text here...",
    "options": [
      {{"id": "a", "text": "Option A text"}},
      {{"id": "b", "text": "Option B text"}},
      {{"id": "c", "text": "Option C text"}},
      {{"id": "d", "text": "Option D text"}}
    ],
    "answer": "b",
    "explanation": "Detailed explanation...",
    "difficulty": "{difficulty}",
    "tags": ["tag1", "tag2"]
  }}
]"""

    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.4,
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content.strip()

        # Clean up JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        import json
        mcqs = json.loads(raw)

        # Add metadata
        for mcq in mcqs:
            mcq["subject"] = subject
            mcq["topic"] = topic
            mcq["source_type"] = "Generated"

        return mcqs
    except Exception as e:
        logger.error(f"MCQ generation failed: {e}")
        return []


async def generate_study_plan(
    weak_subjects: list[str],
    days_until_exam: int,
    daily_hours: int = 4,
) -> str:
    """Generate personalized study plan using Gemini."""
    prompt = f"""Create a detailed {days_until_exam}-day GATE DS study plan.

Student Profile:
- Weak subjects: {', '.join(weak_subjects)}
- Available study time: {daily_hours} hours/day
- Exam: GATE DS (Data Science & AI)

Create a comprehensive plan with:
1. Week-by-week breakdown
2. Daily schedule template
3. Subject-wise time allocation (prioritizing weak areas)
4. Practice test schedule
5. Revision strategy for final week
6. Topic prioritization based on GATE syllabus weight

Format with clear markdown headers, tables, and bullet points."""

    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Study plan generation failed: {e}")
        return "Study plan generation temporarily unavailable. Please try again."
