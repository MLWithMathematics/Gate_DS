"""
seed_probability.py — Uploads detailed Probability & Statistics syllabus chunks based on the cheat sheet.
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

PROBABILITY_CHUNKS = [
    {
        "subject": "Probability and Statistics",
        "topic": "Basic Probability",
        "subtopics": ["Counting", "Permutations", "Combinations", "Probability Axioms", "Sample Space", "Events"],
        "content": "Counting: Multiplication Rule - If the 1st component has n1 possible outcomes and the 2nd component has n2 possible outcomes, the overall experiment has n1 * n2 possibilities. Permutations and Combinations: Ordering matters (Permutation) vs Ordering does not matter (Combination). Naive Definition of Probability: If all outcomes are equally likely, the probability of an event A happening is P(A) = (number of outcomes favorable to A) / (total number of outcomes). Sample Space is the set of all possible outcomes. Events are subsets of the sample space. Probability Axioms: P(A) >= 0 for all A, P(Sample Space) = 1, and for mutually exclusive events, the probability of their union is the sum of their probabilities."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Conditional Probability and Independence",
        "subtopics": ["Independent Events", "Mutually Exclusive Events", "Marginal", "Conditional and Joint Probability", "Bayes Theorem"],
        "content": "Joint Probability P(A and B) is the probability of A and B occurring together. Marginal Probability P(A) is the unconditional probability of A. Conditional Probability P(A|B) = P(A and B) / P(B) is the probability of A given that B occurred. Independent Events: A and B are independent if knowing whether A occurred gives no information about whether B occurred. P(A and B) = P(A)P(B) or P(A|B) = P(A). Mutually Exclusive Events: Events that cannot occur at the same time, P(A and B) = 0. Bayes Theorem: P(A|B) = [P(B|A)P(A)] / P(B). Law of Total Probability (LOTP): P(A) = P(A|B)P(B) + P(A|Not B)P(Not B). This is fundamental for breaking down complex conditional probabilities."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Random Variables and Distributions",
        "subtopics": ["Random Variables", "Discrete Random Variables", "Probability Mass Functions (PMF)", "Cumulative Distribution Function (CDF)"],
        "content": "A Random Variable is a function mapping the sample space to real numbers. Discrete Random Variables take on distinct countable values. The Probability Mass Function (PMF) gives the probability that a discrete random variable takes on a specific value x, denoted as p(x) = P(X = x). The PMF satisfies p(x) >= 0 and the sum of all p(x) equals 1. The Cumulative Distribution Function (CDF) gives the probability that a random variable is less than or equal to x, denoted as F(x) = P(X <= x). The CDF is an increasing, right-continuous function approaching 1 as x approaches infinity."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Continuous Distributions",
        "subtopics": ["Continuous Random Variables", "Probability Distribution Function (PDF)", "Conditional PDF"],
        "content": "Continuous Random Variables take on any value within an interval. The Probability Density Function (PDF), denoted f(x), is the derivative of the CDF. The PDF is nonnegative and integrates to 1. To find the probability that a continuous random variable takes on a value in an interval [a, b], integrate the PDF over that interval: P(a <= X <= b) = F(b) - F(a). The Expected value is the integral of x*f(x). Conditional PDF: f(y|x) = f(x, y) / f(x), which gives the distribution of Y given X=x."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Expectation, Variance, and Moments",
        "subtopics": ["Conditional Expectation", "Variance", "Mean", "Median", "Mode", "Standard Deviation", "Correlation", "Covariance"],
        "content": "Expected Value (Mean) is a weighted average of possible outcomes. For discrete: sum of x*P(X=x). Linearity of Expectation: E(aX + bY + c) = aE(X) + bE(Y) + c. Variance describes the spread of a distribution: Var(X) = E[(X - Mean)^2] = E(X^2) - [E(X)]^2. Standard Deviation is the square root of Variance. Covariance measures how two variables change together: Cov(X,Y) = E(XY) - E(X)E(Y). If independent, Covariance is 0. Correlation is standardized covariance (always between -1 and 1). Conditional Expectation: E(Y|X=x) is the expected value of Y given X=x. Mean, Median (middle value), and Mode (most frequent) describe central tendency."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Common Discrete Distributions",
        "subtopics": ["Uniform", "Bernoulli", "Binomial Distribution", "Poisson"],
        "content": "Discrete Uniform: All outcomes are equally likely. Bernoulli: A single trial resulting in success (prob p) or failure (prob 1-p). Binomial Distribution: The number of successes in n independent Bernoulli trials. PMF is P(X=k) = (n choose k) * p^k * (1-p)^(n-k). Mean is np, Variance is np(1-p). Poisson Distribution: Models rare events or arrivals. PMF is P(X=k) = (e^-lambda * lambda^k) / k!. Mean and Variance both equal lambda. Often used for modeling queues and traffic."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Common Continuous Distributions",
        "subtopics": ["Uniform", "Exponential", "Normal", "Standard Normal", "t-distribution", "chi-squared distribution"],
        "content": "Continuous Uniform Unif(a,b): Constant PDF 1/(b-a) over interval [a,b]. Exponential: Models time between events in a Poisson process. PDF is f(x) = lambda*e^(-lambda*x). Mean is 1/lambda. Normal Distribution N(mean, variance): Bell-shaped curve. Sum of normals is normal. Standard Normal N(0,1): Has mean 0 and variance 1, often denoted with Z. t-distribution: Used when population variance is unknown and sample size is small. Heavier tails than normal. Chi-squared distribution: Sum of squared standard normals, often used in goodness-of-fit tests and sample variance distributions."
    },
    {
        "subject": "Probability and Statistics",
        "topic": "Inferential Statistics",
        "subtopics": ["Central Limit Theorem", "Confidence Interval", "z-test", "t-test", "chi-squared test"],
        "content": "Central Limit Theorem (CLT): As sample size n approaches infinity, the distribution of the sum (or average) of n independent identically distributed random variables approaches a Normal distribution, regardless of the original distribution shape. Confidence Interval: A range of values derived from sample statistics that is likely to contain the value of an unknown population parameter. z-test: Hypothesis test used when sample size is large or population variance is known. t-test: Used for small samples (n < 30) when population variance is unknown. Chi-squared test: Tests for independence in categorical data or goodness of fit between observed and expected frequencies."
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

    for i, chunk in enumerate(PROBABILITY_CHUNKS, 1):
        subject = chunk["subject"]
        topic = chunk["topic"]
        content = chunk["content"]

        log.info(f"  [{i}/{len(PROBABILITY_CHUNKS)}] Inserting {topic}")

        # Delete any existing chunk to avoid duplicates during re-runs
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

    log.info("🎉 Detailed Probability Syllabus uploaded successfully!")

if __name__ == "__main__":
    run_seed()
