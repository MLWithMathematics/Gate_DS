"""
seed_remaining_subjects.py — Uploads detailed syllabus chunks for Linear Algebra, Calculus, ML, AI, DBMS, and DSA.
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

REMAINING_CHUNKS = [
    # LINEAR ALGEBRA
    {
        "subject": "Linear Algebra",
        "topic": "Vector Spaces and Matrices",
        "subtopics": ["Vector space", "subspaces", "linear dependence and independence of vectors", "matrices", "partition matrix and their properties"],
        "content": "A vector space is a collection of vectors that can be added together and multiplied by scalars. A subspace is a subset of a vector space that is itself a vector space. Linear dependence means one vector in a set can be written as a linear combination of others; independence means no vector can be written this way. A matrix is a rectangular array of numbers. A partition matrix is a matrix partitioned into rectangular submatrices called blocks, which simplifies operations on large matrices."
    },
    {
        "subject": "Linear Algebra",
        "topic": "Special Matrices and Properties",
        "subtopics": ["projection matrix", "orthogonal matrix", "idempotent matrix", "quadratic forms", "determinant", "rank", "nullity", "projections"],
        "content": "An orthogonal matrix is a square matrix whose columns and rows are orthogonal unit vectors (its transpose is its inverse). An idempotent matrix is a matrix which, when multiplied by itself, yields itself (P^2 = P). A projection matrix is a square idempotent matrix used to map vectors onto a subspace. Quadratic forms are homogeneous polynomials of degree two in a number of variables, usually written as x^T A x where A is symmetric. The determinant is a scalar value that is a function of the entries of a square matrix. Rank is the maximum number of linearly independent column vectors in the matrix. Nullity is the dimension of the null space of the matrix (Rank-Nullity Theorem: Rank + Nullity = number of columns)."
    },
    {
        "subject": "Linear Algebra",
        "topic": "Linear Equations and Decompositions",
        "subtopics": ["systems of linear equations and solutions", "Gaussian elimination", "eigenvalues and eigenvectors", "LU decomposition", "singular value decomposition"],
        "content": "Systems of linear equations can have zero, one, or infinitely many solutions. Gaussian elimination is an algorithm to solve systems of linear equations by performing row operations to achieve row echelon form. Eigenvectors are non-zero vectors that change only by a scalar factor (the eigenvalue) when a linear transformation is applied (Ax = lambda x). LU decomposition factors a matrix into a lower triangular matrix (L) and an upper triangular matrix (U). Singular Value Decomposition (SVD) is a factorization of a real or complex matrix into U*Sigma*V^T, generalizing the eigendecomposition of a square normal matrix to any m x n matrix."
    },

    # CALCULUS AND OPTIMIZATION
    {
        "subject": "Calculus and Optimization",
        "topic": "Functions and Calculus Basics",
        "subtopics": ["Functions of a single variable", "limit", "continuity and differentiability", "Taylor series"],
        "content": "A function of a single variable assigns each input exactly one output. The limit of a function defines its behavior as the input approaches a specific value. A function is continuous if small changes in the input result in small changes in the output (limit equals the function value). Differentiability implies the existence of a derivative, meaning the function is smooth without sharp corners. Taylor series is an infinite sum of terms that are expressed in terms of the function's derivatives at a single point, used to approximate complex functions."
    },
    {
        "subject": "Calculus and Optimization",
        "topic": "Optimization",
        "subtopics": ["maxima and minima", "optimization involving a single variable"],
        "content": "Maxima and minima are the highest and lowest values of a function. Local maxima/minima occur where the first derivative is zero (critical points) and the second derivative test determines their nature (negative for maxima, positive for minima). Optimization involving a single variable uses these calculus techniques to find the optimal (maximum or minimum) solution to a problem within a given domain."
    },

    # PROGRAMMING, DATA STRUCTURES AND ALGORITHMS
    {
        "subject": "Programming, Data Structures and Algorithms",
        "topic": "Programming and Basic Data Structures",
        "subtopics": ["Programming in Python", "stacks", "queues", "linked lists", "trees", "hash tables"],
        "content": "Python is a high-level, interpreted programming language known for readability. Stacks follow LIFO (Last In First Out) operations (push/pop). Queues follow FIFO (First In First Out) operations (enqueue/dequeue). Linked lists consist of nodes containing data and pointers to the next node. Trees are hierarchical data structures with a root node and child nodes (e.g., Binary Search Trees). Hash tables implement associative arrays, mapping keys to values using a hash function for O(1) average time complexity lookups."
    },
    {
        "subject": "Programming, Data Structures and Algorithms",
        "topic": "Algorithms and Graph Theory",
        "subtopics": ["linear search", "binary search", "selection sort", "bubble sort", "insertion sort", "divide and conquer", "mergesort", "quicksort", "graph theory", "traversals and shortest path"],
        "content": "Linear search checks each element sequentially; binary search finds items in a sorted array by repeatedly dividing the search interval in half. Basic sorting: Bubble sort swaps adjacent out-of-order elements; Insertion sort builds the sorted array one element at a time; Selection sort repeatedly finds the minimum element. Divide and Conquer: breaks problems into subproblems. Mergesort divides the array in half and merges sorted halves (O(n log n)); Quicksort picks a pivot and partitions the array around it. Graph theory involves vertices and edges. Traversals include BFS (Breadth-First) and DFS (Depth-First). Shortest path algorithms (e.g., Dijkstra's) find the minimum path weight between nodes."
    },

    # DATABASE MANAGEMENT AND WAREHOUSING
    {
        "subject": "Database Management and Warehousing",
        "topic": "Database Models and SQL",
        "subtopics": ["ER-model", "relational model", "relational algebra", "tuple calculus", "SQL", "integrity constraints", "normal form", "file organization", "indexing"],
        "content": "The Entity-Relationship (ER) model defines entities, attributes, and relationships to design databases conceptually. The Relational model structures data into tables (relations). Relational algebra provides procedural operators (select, project, join); tuple calculus is declarative. SQL (Structured Query Language) is used to manage relational databases. Integrity constraints ensure data accuracy (Primary Keys, Foreign Keys). Normalization reduces redundancy (1NF, 2NF, 3NF, BCNF). File organization and indexing (like B-trees) optimize data storage and fast retrieval."
    },
    {
        "subject": "Database Management and Warehousing",
        "topic": "Data Warehousing and Transformation",
        "subtopics": ["data types", "data transformation", "normalization", "discretization", "sampling", "compression", "data warehouse modelling", "schema for multidimensional data models", "concept hierarchies", "measures"],
        "content": "Data transformation involves cleaning and structuring data. Normalization scales data; discretization bins continuous data; sampling selects representative subsets; compression reduces size. A data warehouse is a central repository of integrated data from multiple sources. Modelling uses multidimensional schemas like Star schema and Snowflake schema, consisting of Fact tables (containing measures/computations) and Dimension tables. Concept hierarchies define a sequence of mappings from a set of lower-level concepts to higher-level, more general concepts (e.g., City -> State -> Country) enabling drill-down and roll-up analysis."
    },

    # MACHINE LEARNING
    {
        "subject": "Machine Learning",
        "topic": "Supervised Learning Fundamentals",
        "subtopics": ["regression and classification", "simple linear regression", "multiple linear regression", "ridge regression", "logistic regression", "k-nearest neighbour", "naive Bayes classifier", "linear discriminant analysis", "support vector machine", "decision trees"],
        "content": "Supervised learning models learn from labeled training data. Regression predicts continuous targets, while classification predicts discrete classes. Simple/Multiple Linear Regression fits a linear equation to data. Ridge regression adds L2 regularization to prevent overfitting. Logistic regression is used for binary classification, outputting probabilities via a sigmoid function. k-Nearest Neighbour (k-NN) classifies based on the majority class of the k closest data points. Naive Bayes applies Bayes' theorem assuming feature independence. Linear Discriminant Analysis (LDA) finds a linear combination of features that separates classes. Support Vector Machines (SVM) find the optimal hyperplane maximizing the margin between classes. Decision trees split data based on feature thresholds to make predictions."
    },
    {
        "subject": "Machine Learning",
        "topic": "Model Evaluation and Neural Networks",
        "subtopics": ["bias-variance trade-off", "cross-validation", "leave-one-out (LOO)", "k-folds cross-validation", "multi-layer perceptron", "feed-forward neural network"],
        "content": "The bias-variance trade-off is the balance between underfitting (high bias, simple model) and overfitting (high variance, overly complex model). Cross-validation assesses model generalization. k-folds divides data into k subsets, training on k-1 and validating on 1 iteratively. Leave-one-out (LOO) is an extreme k-folds where k equals the number of data points. A Multi-Layer Perceptron (MLP) is a class of feed-forward artificial neural networks consisting of at least three layers of nodes (input, hidden, output) utilizing non-linear activation functions and trained via backpropagation."
    },
    {
        "subject": "Machine Learning",
        "topic": "Unsupervised Learning",
        "subtopics": ["clustering algorithms", "k-means", "k-medoid", "hierarchical clustering", "single-linkage", "multiple-linkage", "dimensionality reduction", "principal component analysis"],
        "content": "Unsupervised learning extracts patterns from unlabeled data. Clustering groups similar data points. k-means minimizes variance within k clusters by adjusting centroids; k-medoids uses actual data points as centers. Hierarchical clustering builds a tree of clusters (dendrogram) either top-down (divisive) or bottom-up (agglomerative), using metrics like single-linkage (shortest distance between clusters) or multiple-linkage/complete-linkage (maximum distance). Dimensionality reduction simplifies datasets while retaining information. Principal Component Analysis (PCA) projects data onto orthogonal axes (principal components) that maximize variance."
    },

    # ARTIFICIAL INTELLIGENCE
    {
        "subject": "Artificial Intelligence",
        "topic": "Search and Logic",
        "subtopics": ["informed search", "uninformed search", "adversarial search", "propositional logic", "predicate logic"],
        "content": "Search algorithms navigate state spaces to find solutions. Uninformed search (BFS, DFS) has no domain-specific guidance. Informed search (A* search) uses heuristics to estimate the cost to the goal, making it more efficient. Adversarial search (Minimax, Alpha-Beta pruning) is used in game theory environments where agents compete. Logic represents knowledge. Propositional logic uses simple declarative statements (propositions) and boolean connectives (AND, OR, NOT). Predicate logic (First-Order Logic) extends this with variables, quantifiers (For All, There Exists), and predicates to represent relationships between objects."
    },
    {
        "subject": "Artificial Intelligence",
        "topic": "Reasoning Under Uncertainty",
        "subtopics": ["conditional independence representation", "exact inference through variable elimination", "approximate inference through sampling"],
        "content": "AI must often reason with incomplete information using probability. Bayesian Networks represent joint probability distributions via directed acyclic graphs, leveraging conditional independence to compactly encode beliefs. Inference is the process of computing probabilities of query variables given evidence. Exact inference techniques like Variable Elimination systematically sum out hidden variables to compute exact probabilities, though it can be computationally expensive. Approximate inference uses sampling methods (like Monte Carlo, Gibbs sampling, or particle filtering) to estimate probabilities when exact inference is intractable in large networks."
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

    for i, chunk in enumerate(REMAINING_CHUNKS, 1):
        subject = chunk["subject"]
        topic = chunk["topic"]
        content = chunk["content"]

        log.info(f"  [{i}/{len(REMAINING_CHUNKS)}] Inserting {subject} - {topic}")

        # Delete existing chunks for this exact topic to avoid duplicates
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

    log.info("🎉 Entire Remaining Syllabus uploaded successfully!")

if __name__ == "__main__":
    run_seed()
