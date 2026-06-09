"""
seed_pdf_syllabus.py — Uploads the official GATE 2026 DA PDF syllabus into Supabase.
"""

import os
import sys
import time
import logging
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sentence_transformers import SentenceTransformer
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

OFFICIAL_SYLLABUS_CHUNKS = [
    {
        "subject": "Probability and Statistics",
        "topic": "Official Syllabus 2026",
        "content": "Probability and Statistics: Counting (permutation and combinations), probability axioms, Sample space, events, independent events, mutually exclusive events, marginal, conditional and joint probability, Bayes Theorem, conditional expectation and variance, mean, median, mode and standard deviation, correlation, and covariance, random variables, discrete random variables and probability mass functions, uniform, Bernoulli, binomial distribution, Continuous random variables and probability distribution function, uniform, exponential, Poisson, normal, standard normal, t-distribution, chi-squared distributions, cumulative distribution function, Conditional PDF, Central limit theorem, confidence interval, z-test, t-test, chi-squared test.",
        "subtopics": ["Probability", "Random Variables", "Distributions", "Statistics", "Hypothesis Testing"]
    },
    {
        "subject": "Linear Algebra",
        "topic": "Official Syllabus 2026",
        "content": "Linear Algebra: Vector space, subspaces, linear dependence and independence of vectors, matrices, projection matrix, orthogonal matrix, idempotent matrix, partition matrix and their properties, quadratic forms, systems of linear equations and solutions; Gaussian elimination, eigenvalues and eigenvectors, determinant, rank, nullity, projections, LU decomposition, singular value decomposition.",
        "subtopics": ["Vector Spaces", "Matrices", "Linear Equations", "Eigenvalues", "Decompositions"]
    },
    {
        "subject": "Calculus and Optimization",
        "topic": "Official Syllabus 2026",
        "content": "Calculus and Optimization: Functions of a single variable, limit, continuity and differentiability, Taylor series, maxima and minima, optimization involving a single variable.",
        "subtopics": ["Calculus", "Optimization"]
    },
    {
        "subject": "Programming, Data Structures and Algorithms",
        "topic": "Official Syllabus 2026",
        "content": "Programming, Data Structures and Algorithms: Programming in Python, basic data structures: stacks, queues, linked lists, trees, hash tables; Search algorithms: linear search and binary search, basic sorting algorithms: selection sort, bubble sort and insertion sort; divide and conquer: mergesort, quicksort; introduction to graph theory; basic graph algorithms: traversals and shortest path.",
        "subtopics": ["Python", "Data Structures", "Search & Sort Algorithms", "Graph Theory"]
    },
    {
        "subject": "Database Management and Warehousing",
        "topic": "Official Syllabus 2026",
        "content": "Database Management and Warehousing: ER-model, relational model: relational algebra, tuple calculus, SQL, integrity constraints, normal form, file organization, indexing, data types, data transformation such as normalization, discretization, sampling, compression; data warehouse modelling: schema for multidimensional data models, concept hierarchies, measures: categorization and computations.",
        "subtopics": ["ER Model", "Relational Model", "SQL", "Normalization", "Data Warehousing"]
    },
    {
        "subject": "Machine Learning",
        "topic": "Official Syllabus 2026",
        "content": "Machine Learning: (i) Supervised Learning: regression and classification problems, simple linear regression, multiple linear regression, ridge regression, logistic regression, k-nearest neighbour, naive Bayes classifier, linear discriminant analysis, support vector machine, decision trees, bias-variance trade-off, cross-validation methods such as leave-one-out (LOO) cross-validation, k-folds cross-validation, multi-layer perceptron, feed-forward neural network; (ii) Unsupervised Learning: clustering algorithms, k-means/k-medoid, hierarchical clustering, top-down, bottom-up: single-linkage, multiple-linkage, dimensionality reduction, principal component analysis.",
        "subtopics": ["Supervised Learning", "Unsupervised Learning", "Neural Networks", "PCA"]
    },
    {
        "subject": "Artificial Intelligence",
        "topic": "Official Syllabus 2026",
        "content": "AI: Search: informed, uninformed, adversarial; logic, propositional, predicate; reasoning under uncertainty topics — conditional independence representation, exact inference through variable elimination, and approximate inference through sampling.",
        "subtopics": ["Search", "Logic", "Reasoning Under Uncertainty"]
    }
]

def run_seed():
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    log.info("🔗 Connecting to Supabase...")
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    log.info("🤖 Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    log.info("✅ Model loaded.")

    for i, chunk in enumerate(OFFICIAL_SYLLABUS_CHUNKS, 1):
        subject = chunk["subject"]
        topic = chunk["topic"]
        content = chunk["content"]

        log.info(f"  [{i}/{len(OFFICIAL_SYLLABUS_CHUNKS)}] Inserting {subject}")

        # Delete old matching official syllabus chunks if they exist
        db.table("syllabus_chunks").delete().eq("subject", subject).eq("topic", topic).execute()

        embed_text = f"{subject}. {topic}. {content}"
        embedding = model.encode(embed_text, normalize_embeddings=True).tolist()

        row = {
            "subject": subject,
            "topic": topic,
            "content": content,
            "subtopics": chunk.get("subtopics", []),
            "embedding": embedding,
        }
        
        result = db.table("syllabus_chunks").insert(row).execute()
        if result.data:
             log.info(f"      ✅ Inserted!")
        else:
             log.warning(f"      ⚠ Failed to insert")

        time.sleep(0.2)

    log.info("🎉 Official 2026 GATE DA PDF Syllabus uploaded successfully!")

if __name__ == "__main__":
    run_seed()
