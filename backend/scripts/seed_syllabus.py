"""
seed_syllabus.py — Populate Supabase syllabus_chunks with GATE DS content + embeddings
========================================================================================

Run:
    cd backend
    python scripts/seed_syllabus.py

Requirements:
    - .env file with SUPABASE_URL and SUPABASE_KEY
    - pip install sentence-transformers supabase python-dotenv
"""

import os
import sys
import time
import logging
from pathlib import Path

# ── resolve project root so imports work ──────────────────────────
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sentence_transformers import SentenceTransformer
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════
# GATE DS SYLLABUS CONTENT
# Each dict = one chunk inserted as one row in syllabus_chunks
# Add/edit chunks freely — more chunks = better RAG retrieval
# ══════════════════════════════════════════════════════════════════

SYLLABUS_CHUNKS = [

    # ── MACHINE LEARNING ─────────────────────────────────────────
    {
        "subject": "Machine Learning",
        "topic": "Supervised Learning",
        "subtopics": ["Linear Regression", "Logistic Regression", "k-NN", "Decision Trees"],
        "content": """Supervised Learning algorithms learn a mapping from inputs X to outputs y using labeled training data.

Linear Regression: Models y = Xβ + ε. The OLS solution is β̂ = (XᵀX)⁻¹Xᵀy.
Loss function: MSE = (1/n)Σ(yᵢ - ŷᵢ)².
Assumptions (Gauss-Markov): linearity, no multicollinearity, zero-mean errors, homoscedasticity.

Logistic Regression: For binary classification. Models P(y=1|x) = σ(wᵀx) where σ(z) = 1/(1+e⁻ᶻ).
Loss: Binary Cross-Entropy = -[y·log(p) + (1-y)·log(1-p)].
Decision boundary: wᵀx = 0 (linear boundary in feature space).

k-Nearest Neighbours (k-NN): Non-parametric, lazy learner. Predicts by majority vote of k nearest training points.
Distance metrics: Euclidean, Manhattan, Minkowski.
k=1 → low bias, high variance. Large k → high bias, low variance.

Decision Trees: Splits features recursively using information gain or Gini impurity.
Gini = 1 - Σpᵢ². Entropy = -Σpᵢ·log₂(pᵢ). Information Gain = Entropy(parent) - Σwᵢ·Entropy(child).
Prone to overfitting — use pruning or ensemble methods.""",
    },
    {
        "subject": "Machine Learning",
        "topic": "SVM",
        "subtopics": ["Kernel Trick", "Margin", "Support Vectors", "Soft Margin"],
        "content": """Support Vector Machines (SVM) find the maximum-margin hyperplane separating classes.

Hard Margin SVM: Maximize 2/||w|| subject to yᵢ(wᵀxᵢ + b) ≥ 1 for all i.
Support Vectors: Training points that lie exactly on the margin boundaries.
Decision function: f(x) = sign(wᵀx + b).

Soft Margin SVM: Allows misclassification via slack variables ξᵢ ≥ 0.
Objective: min ½||w||² + C·Σξᵢ. C controls bias-variance tradeoff.
Large C → low bias (more complex boundary), small C → higher regularization.

Kernel Trick: Maps data to higher-dimensional space via kernel function K(x, z) = φ(x)ᵀφ(z).
Common kernels:
  - Linear: K(x,z) = xᵀz
  - Polynomial: K(x,z) = (xᵀz + c)ᵈ
  - RBF/Gaussian: K(x,z) = exp(-γ||x-z||²)
  - Sigmoid: K(x,z) = tanh(αxᵀz + c)

Dual formulation: Maximize Σαᵢ - ½ΣΣαᵢαⱼyᵢyⱼK(xᵢ,xⱼ) subject to 0 ≤ αᵢ ≤ C, Σαᵢyᵢ = 0.

SVM for multi-class: One-vs-One (k(k-1)/2 classifiers) or One-vs-Rest (k classifiers).""",
    },
    {
        "subject": "Machine Learning",
        "topic": "Ensemble Methods",
        "subtopics": ["Bagging", "Boosting", "Random Forest", "Gradient Boosting", "XGBoost"],
        "content": """Ensemble Methods combine multiple weak learners to build a strong learner.

Bagging (Bootstrap Aggregating):
- Train B models on B bootstrapped datasets (sampling with replacement)
- Final prediction: majority vote (classification) or mean (regression)
- Reduces variance without increasing bias
- Models trained independently (parallelizable)
- Random Forest = Bagging + random feature subset at each split (√p features for classification, p/3 for regression)
- Out-of-Bag (OOB) error: ~37% of samples not seen in each bootstrap — used as validation

Boosting:
- Sequential training: each model corrects errors of the previous
- Reduces bias and variance
- AdaBoost: Reweights misclassified samples. Final model: H(x) = sign(Σαₘhₘ(x))
- Gradient Boosting: Fits new model to residuals (negative gradient of loss)
  - Learning rate η controls step size
  - Subsampling adds randomness (stochastic GBM)
- XGBoost: Regularized objective, second-order Taylor expansion, parallel tree building

Stacking: Train meta-learner on out-of-fold predictions of base learners.

Key difference — Bagging vs Boosting:
  Bagging: parallel, reduces variance, handles high-variance models (deep trees)
  Boosting: sequential, reduces bias, handles high-bias models (shallow trees)""",
    },
    {
        "subject": "Machine Learning",
        "topic": "Model Evaluation",
        "subtopics": ["Cross Validation", "ROC-AUC", "Precision Recall", "Overfitting", "Bias-Variance"],
        "content": """Model Evaluation and Selection in Machine Learning.

Bias-Variance Tradeoff:
  Total Error = Bias² + Variance + Irreducible Noise
  High Bias → underfitting (model too simple)
  High Variance → overfitting (model too complex)
  Goal: find sweet spot balancing both

Cross-Validation:
  k-Fold CV: Split data into k folds; train on k-1, validate on 1; repeat k times; average results.
  Leave-One-Out (LOO-CV): k = n; computationally expensive but low bias.
  Stratified k-Fold: Preserves class proportions in each fold.

Classification Metrics:
  Accuracy = (TP+TN)/(TP+TN+FP+FN)
  Precision = TP/(TP+FP)   — "of predicted positives, how many are truly positive?"
  Recall = TP/(TP+FN)       — "of all actual positives, how many did we find?"
  F1 Score = 2·P·R/(P+R)   — harmonic mean of precision and recall
  ROC-AUC: Area under the ROC curve; measures discrimination ability. AUC=0.5 → random, AUC=1 → perfect.
  PR-AUC: Better for imbalanced datasets.

Regression Metrics:
  MAE = (1/n)Σ|yᵢ - ŷᵢ|
  MSE = (1/n)Σ(yᵢ - ŷᵢ)²
  RMSE = √MSE
  R² = 1 - SS_res/SS_tot  (proportion of variance explained)

Regularization to prevent overfitting:
  L2 Ridge: adds λ·||w||² — shrinks all weights, keeps all features
  L1 Lasso: adds λ·||w||₁ — produces sparse solution (feature selection)
  ElasticNet: combines L1 + L2""",
    },

    # ── DEEP LEARNING ────────────────────────────────────────────
    {
        "subject": "Deep Learning",
        "topic": "Neural Networks",
        "subtopics": ["Perceptron", "Backpropagation", "Activation Functions", "Vanishing Gradient"],
        "content": """Neural Networks: Layered computational graphs of neurons.

Architecture: Input → Hidden Layers → Output.
Each neuron: z = Wᵀx + b, a = f(z) where f is activation function.

Activation Functions:
  Sigmoid: σ(z) = 1/(1+e⁻ᶻ). Output ∈ (0,1). Gradient: σ(z)(1-σ(z)) ≤ 0.25 → vanishing gradient.
  Tanh: tanh(z) = (eᶻ-e⁻ᶻ)/(eᶻ+e⁻ᶻ). Output ∈ (-1,1). Stronger gradients than sigmoid but still vanishes.
  ReLU: f(z) = max(0,z). Gradient = 1 for z>0, 0 for z<0. Solves vanishing gradient. Risk: "dying ReLU".
  Leaky ReLU: f(z) = z if z>0 else αz (α≈0.01). Fixes dying ReLU.
  ELU, SELU: Smooth negative region, zero-centered.
  Softmax: σ(zᵢ) = eᶻⁱ/Σeᶻʲ. Used in output layer for multi-class classification.

Backpropagation: Computes gradients via chain rule.
  Forward pass: compute all activations.
  Backward pass: δᴸ = ∇_a L ⊙ f'(zᴸ), propagate: δˡ = (Wˡ⁺¹)ᵀδˡ⁺¹ ⊙ f'(zˡ).
  Weight update: W ← W - η·(∂L/∂W).

Vanishing Gradient Problem:
  In deep networks with sigmoid/tanh, gradients shrink exponentially through layers.
  Solutions: ReLU, batch normalization, residual connections (ResNets), gradient clipping.

Exploding Gradients: Gradients grow exponentially. Solution: gradient clipping.

Weight Initialization:
  Xavier/Glorot: W ~ U[-1/√n, 1/√n]. Good for sigmoid/tanh.
  He Initialization: W ~ N(0, 2/n). Good for ReLU.""",
    },
    {
        "subject": "Deep Learning",
        "topic": "CNNs",
        "subtopics": ["Convolution", "Pooling", "ResNet", "VGG", "Transfer Learning"],
        "content": """Convolutional Neural Networks (CNNs) for spatial data (images, audio).

Convolution Operation:
  (f * g)(t) = Σf(τ)g(t-τ). In 2D: output[i,j] = ΣΣInput[i+m, j+n]·Filter[m,n].
  Output size: ((W - F + 2P) / S) + 1. W=input, F=filter, P=padding, S=stride.
  Parameters in conv layer: F × F × C_in × C_out + C_out (biases).

Pooling: Reduces spatial dimensions.
  Max Pooling: Takes maximum in each window. Preserves dominant features.
  Average Pooling: Takes average. Smoother.
  Global Average Pooling (GAP): Reduces each feature map to a single value.

Famous Architectures:
  LeNet-5: First successful CNN (1998). 5 layers, MNIST.
  AlexNet: 8 layers, ReLU, dropout, data augmentation. ImageNet 2012 winner.
  VGG-16/19: Deep network with 3×3 filters throughout. Simple and uniform.
  InceptionNet: Parallel convolutions at different scales, 1×1 bottlenecks.
  ResNet: Skip connections. F(x) + x. Solves vanishing gradient. Enables 100+ layer networks.
    Residual block: output = F(x, {Wᵢ}) + x.
  EfficientNet: Neural Architecture Search, compound scaling.

Transfer Learning: Use pretrained weights from ImageNet.
  Feature extraction: freeze all layers, train only new head.
  Fine-tuning: unfreeze later layers, train with small learning rate.""",
    },
    {
        "subject": "Deep Learning",
        "topic": "Transformers",
        "subtopics": ["Self-Attention", "Multi-Head Attention", "BERT", "GPT", "Positional Encoding"],
        "content": """Transformer Architecture: Attention is All You Need (Vaswani et al., 2017).

Self-Attention Mechanism:
  Q = XWQ, K = XWK, V = XWV  (Query, Key, Value projections)
  Attention(Q,K,V) = softmax(QKᵀ / √dₖ) · V
  The √dₖ scaling prevents dot products from becoming too large.
  Attention weight aᵢⱼ = how much token i should attend to token j.

Multi-Head Attention:
  Run h parallel attention heads with different projections.
  MultiHead(Q,K,V) = Concat(head₁,...,headₕ) Wᴼ
  Each head: headᵢ = Attention(QWᵢQ, KWᵢK, VWᵢV)
  Allows attending to different positions and representation subspaces.

Positional Encoding: Since attention has no order, add position info.
  PE(pos, 2i) = sin(pos/10000^(2i/d_model))
  PE(pos, 2i+1) = cos(pos/10000^(2i/d_model))

Encoder: Self-attention + Feed-forward. Used in BERT.
Decoder: Masked self-attention + cross-attention + feed-forward. Used in GPT.

BERT (Bidirectional Encoder): Pre-trained on Masked Language Modeling (MLM) + Next Sentence Prediction.
  Fine-tuned for: classification, NER, QA.

GPT (Decoder only): Autoregressive language model. Predicts next token given all previous tokens.
  GPT-3/4: Emergent few-shot learning.

Computational Complexity: O(n²·d) for sequence length n and dimension d.
  Efficient alternatives: Sparse Attention, Linformer, FlashAttention.""",
    },
    {
        "subject": "Deep Learning",
        "topic": "Optimization",
        "subtopics": ["SGD", "Adam", "Batch Normalization", "Dropout", "Learning Rate"],
        "content": """Optimization Algorithms for Training Deep Networks.

Gradient Descent Variants:
  Batch GD: Use all data. Stable but slow for large datasets.
  Stochastic GD (SGD): One sample per update. Noisy but fast, can escape local minima.
  Mini-batch GD: Typical practice. Batch size 32-512.

Momentum: Accumulates gradient directions. vₜ = βvₜ₋₁ + (1-β)∇L. w ← w - ηvₜ.
Nesterov Momentum: Computes gradient at lookahead point.

Adam (Adaptive Moment Estimation):
  mₜ = β₁mₜ₋₁ + (1-β₁)∇L  (1st moment — mean)
  vₜ = β₂vₜ₋₁ + (1-β₂)(∇L)²  (2nd moment — uncentered variance)
  m̂ₜ = mₜ/(1-β₁ᵗ), v̂ₜ = vₜ/(1-β₂ᵗ)  (bias correction)
  θₜ = θₜ₋₁ - η·m̂ₜ/(√v̂ₜ + ε)
  Default: β₁=0.9, β₂=0.999, ε=1e-8.
  
RMSProp, AdaGrad, AdamW (with decoupled weight decay).

Batch Normalization (BatchNorm):
  Normalize layer inputs: x̂ = (x-μ)/σ, then scale/shift: y = γx̂ + β.
  Applied before activation. Reduces internal covariate shift.
  Allows higher learning rates. Acts as regularizer.

Dropout: Randomly zero out neurons with probability p during training.
  At inference: multiply weights by (1-p) (inverted dropout: divide by (1-p) during training).
  Prevents co-adaptation of neurons. Works as ensemble of networks.

Learning Rate Scheduling:
  Step decay, cosine annealing, warmup + decay, cyclic LR.
  Too high LR → divergence. Too low → slow convergence.""",
    },

    # ── STATISTICS ───────────────────────────────────────────────
    {
        "subject": "Statistics",
        "topic": "Probability Distributions",
        "subtopics": ["Normal", "Binomial", "Poisson", "Exponential", "Chi-squared", "t-distribution"],
        "content": """Key Probability Distributions for GATE DS.

Normal Distribution: X ~ N(μ, σ²)
  PDF: f(x) = (1/σ√2π) exp(-(x-μ)²/2σ²)
  Standard Normal: Z = (X-μ)/σ ~ N(0,1)
  Sum of normals: If X~N(μ₁,σ₁²) and Y~N(μ₂,σ₂²) independent → X+Y ~ N(μ₁+μ₂, σ₁²+σ₂²)
  68-95-99.7 rule: P(μ±σ)=68%, P(μ±2σ)=95%, P(μ±3σ)=99.7%

Binomial Distribution: X ~ Bin(n, p)
  P(X=k) = C(n,k)·pᵏ·(1-p)ⁿ⁻ᵏ
  Mean = np, Variance = np(1-p)
  Approximation: → Normal when n large, → Poisson when p small

Poisson Distribution: X ~ Pois(λ)
  P(X=k) = e⁻λ·λᵏ/k!
  Mean = Variance = λ
  Models rare events (arrivals, clicks)

Exponential Distribution: X ~ Exp(λ)
  PDF: f(x) = λe⁻λˣ for x≥0
  Mean = 1/λ, Variance = 1/λ²
  Memoryless: P(X>s+t|X>s) = P(X>t)

Chi-squared Distribution: X ~ χ²(k)
  Sum of k squared standard normals: X = Z₁²+...+Zₖ²
  Mean = k, Variance = 2k
  Used in: goodness-of-fit tests, test of independence, confidence intervals for variance.

t-Distribution: t ~ t(ν)
  Heavier tails than normal. Used when population variance unknown and sample size small.
  t = (X̄ - μ)/(s/√n). As ν→∞, t→N(0,1).

F-Distribution: Ratio of two chi-squared variables. Used in ANOVA, regression F-test.""",
    },
    {
        "subject": "Statistics",
        "topic": "Hypothesis Testing",
        "subtopics": ["p-value", "Type I Error", "Type II Error", "Power", "t-test", "ANOVA"],
        "content": """Hypothesis Testing: Statistical framework for making decisions from data.

Steps:
  1. State H₀ (null) and H₁ (alternative)
  2. Choose significance level α (typically 0.05)
  3. Compute test statistic
  4. Find p-value
  5. Reject H₀ if p-value < α

Errors:
  Type I Error (α): Reject H₀ when it is true (False Positive). P(Type I) = α.
  Type II Error (β): Fail to reject H₀ when it is false (False Negative). P(Type II) = β.
  Power = 1 - β = P(correctly rejecting false H₀).
  Relationship: Decreasing α increases β (and decreases power).

p-value: Probability of observing data as extreme as seen, assuming H₀ is true.
  Small p-value → evidence against H₀.

Common Tests:
  One-sample t-test: t = (X̄ - μ₀)/(s/√n), df = n-1.
  Two-sample t-test (independent): t = (X̄₁-X̄₂)/√(s₁²/n₁+s₂²/n₂).
  Paired t-test: t = d̄/(sᵈ/√n) where d = differences.
  Chi-squared test: χ² = Σ(O-E)²/E. Tests independence in contingency tables.
  ANOVA: Tests equality of means across ≥3 groups.
    F = MS_between/MS_within = (SS_B/(k-1)) / (SS_W/(N-k)).
    H₀: all group means equal. Reject if F > F_critical.

Multiple Testing: Bonferroni correction: use α/m for m tests.
  Benjamini-Hochberg: controls False Discovery Rate (FDR).

Confidence Interval: CI = X̄ ± t*(s/√n). 95% CI means in repeated sampling, 95% of CIs contain μ.""",
    },
    {
        "subject": "Statistics",
        "topic": "Bayesian Statistics",
        "subtopics": ["Bayes Theorem", "Prior", "Posterior", "MAP", "MLE", "Conjugate Priors"],
        "content": """Bayesian Statistics: Treats parameters as random variables with probability distributions.

Bayes' Theorem:
  P(θ|X) = P(X|θ)·P(θ) / P(X)
  Posterior = Likelihood × Prior / Evidence
  P(θ|X) ∝ P(X|θ)·P(θ)

Key Concepts:
  Prior P(θ): Belief about parameter before seeing data.
  Likelihood P(X|θ): Probability of data given parameters.
  Posterior P(θ|X): Updated belief after seeing data.
  Evidence P(X) = ∫P(X|θ)P(θ)dθ: Normalizing constant.

MLE vs MAP:
  MLE: θ̂_MLE = argmax P(X|θ). Maximizes likelihood.
  MAP: θ̂_MAP = argmax P(θ|X) = argmax P(X|θ)·P(θ). Includes prior.
  MAP with Gaussian prior ↔ L2 regularization.
  MAP with Laplace prior ↔ L1 regularization.

Conjugate Priors (prior and posterior have same distribution family):
  Beta-Binomial: Beta prior + Binomial likelihood → Beta posterior.
  Normal-Normal: Normal prior + Normal likelihood → Normal posterior.
  Dirichlet-Multinomial: Dirichlet prior + Multinomial → Dirichlet posterior.
  Gamma-Poisson: Gamma prior + Poisson → Gamma posterior.

Naive Bayes Classifier:
  P(y|x₁,...,xₙ) ∝ P(y)·ΠP(xᵢ|y)  (assumes feature independence)
  Gaussian NB: assumes P(xᵢ|y) ~ Normal.
  Works well for text classification despite strong independence assumption.""",
    },

    # ── LINEAR ALGEBRA ────────────────────────────────────────────
    {
        "subject": "Linear Algebra",
        "topic": "Eigenvalues and Eigenvectors",
        "subtopics": ["Characteristic Equation", "Diagonalization", "Spectral Theorem", "PCA"],
        "content": """Eigenvalues and Eigenvectors: Fundamental to ML (PCA, covariance, PageRank).

Definition: Av = λv where v≠0 is an eigenvector and λ is its eigenvalue.
  (A - λI)v = 0 → det(A - λI) = 0  (characteristic equation).

Properties:
  Trace(A) = Σλᵢ  (sum of eigenvalues = sum of diagonal elements)
  det(A) = Πλᵢ   (product of eigenvalues)
  Eigenvalues of A² are λᵢ². Eigenvalues of A⁻¹ are 1/λᵢ.
  Symmetric matrices: eigenvalues are real; eigenvectors are orthogonal.

Diagonalization: A = PΛP⁻¹ where Λ = diag(λ₁,...,λₙ), P = [v₁...vₙ].
  Condition: A must have n linearly independent eigenvectors.
  Symmetric matrices are always diagonalizable (Spectral Theorem).

SVD (Singular Value Decomposition): A = UΣVᵀ
  U: m×m orthogonal (left singular vectors)
  Σ: m×n diagonal (singular values σᵢ ≥ 0)
  V: n×n orthogonal (right singular vectors)
  Relation to eigenvalues: σᵢ = √λᵢ(AᵀA), columns of V = eigenvectors of AᵀA.
  Applications: PCA, LSA, matrix completion, pseudo-inverse.

PCA (Principal Component Analysis):
  1. Center data: X ← X - X̄
  2. Compute covariance: C = XᵀX/(n-1)
  3. Eigendecompose C = VΛVᵀ
  4. Project: Z = XV (columns of V = principal components)
  Variance explained by kth PC: λₖ/Σλᵢ.
  Choose k PCs retaining ≥95% variance.""",
    },
    {
        "subject": "Linear Algebra",
        "topic": "Matrix Operations",
        "subtopics": ["Matrix Multiplication", "Determinant", "Inverse", "Rank", "Null Space"],
        "content": """Core Matrix Operations and Properties.

Matrix Multiplication: (AB)ᵢⱼ = Σₖ Aᵢₖ Bₖⱼ. Dimensions: (m×n)(n×p) = (m×p).
  Not commutative: AB ≠ BA in general.
  (AB)ᵀ = BᵀAᵀ. (AB)⁻¹ = B⁻¹A⁻¹.

Transpose: (Aᵀ)ᵢⱼ = Aⱼᵢ.
  Symmetric: A = Aᵀ. Skew-symmetric: A = -Aᵀ.
  Orthogonal: AᵀA = AAᵀ = I → A⁻¹ = Aᵀ.

Determinant: det(A) = Σσ sgn(σ)Πᵢ Aᵢ,σ(ᵢ).
  det(AB) = det(A)·det(B). det(Aᵀ) = det(A). det(A⁻¹) = 1/det(A).
  det=0 → singular matrix (non-invertible).

Inverse: AA⁻¹ = I. Exists iff det(A) ≠ 0.
  A⁻¹ = adj(A)/det(A). For 2×2: [[a,b],[c,d]]⁻¹ = (1/(ad-bc))[[d,-b],[-c,a]].

Rank: Number of linearly independent rows (= columns).
  rank(A) + nullity(A) = n  (Rank-Nullity Theorem).
  Full rank: rank = min(m,n). Rank deficiency → system may have no unique solution.

Four Fundamental Subspaces:
  Column space (range), Row space, Null space (kernel), Left null space.
  Ax = b has solution iff b is in column space of A.

Norms:
  L1: ||x||₁ = Σ|xᵢ|. L2 (Euclidean): ||x||₂ = √(Σxᵢ²). L∞: max|xᵢ|.
  Frobenius norm: ||A||_F = √(ΣΣaᵢⱼ²) = √(trace(AᵀA)).""",
    },

    # ── MATHEMATICS ──────────────────────────────────────────────
    {
        "subject": "Mathematics",
        "topic": "Calculus and Optimization",
        "subtopics": ["Derivatives", "Gradient", "Hessian", "Convexity", "Lagrangian", "Chain Rule"],
        "content": """Calculus and Optimization — Core tools in Machine Learning.

Derivatives and Gradients:
  Derivative: f'(x) = lim_{h→0} [f(x+h)-f(x)]/h.
  Partial derivative: ∂f/∂xᵢ holds all other variables constant.
  Gradient: ∇f = [∂f/∂x₁, ..., ∂f/∂xₙ]ᵀ. Points in direction of steepest ascent.
  Jacobian: J ∈ ℝᵐˣⁿ, Jᵢⱼ = ∂fᵢ/∂xⱼ. Generalizes gradient to vector functions.
  Hessian: H ∈ ℝⁿˣⁿ, Hᵢⱼ = ∂²f/∂xᵢ∂xⱼ. Second-order curvature information.

Chain Rule: d/dx[f(g(x))] = f'(g(x))·g'(x). Fundamental to backpropagation.

Convexity:
  Convex function: f(λx+(1-λ)y) ≤ λf(x)+(1-λ)f(y) for λ∈[0,1].
  Condition: f''(x) ≥ 0 (scalar), H ≽ 0 (positive semidefinite Hessian).
  Convex → any local minimum is global minimum.
  Strongly convex: H ≽ μI (guarantees unique global minimum).

Optimization Conditions:
  Necessary (1st order): ∇f(x*) = 0.
  Sufficient (2nd order): H(x*) positive definite.
  Saddle point: ∇f=0 but H has mixed signs.

Constrained Optimization — Lagrangian:
  Minimize f(x) subject to g(x) = 0.
  Lagrangian: L(x,λ) = f(x) + λg(x).
  KKT conditions (inequality constraints gᵢ(x) ≤ 0):
    ∇f + Σλᵢ∇gᵢ = 0, λᵢ ≥ 0, λᵢgᵢ = 0.

Common Derivatives:
  d/dx[xⁿ] = nxⁿ⁻¹. d/dx[eˣ] = eˣ. d/dx[ln x] = 1/x.
  d/dx[σ(x)] = σ(x)(1-σ(x)). d/dx[tanh(x)] = 1-tanh²(x).""",
    },
    {
        "subject": "Mathematics",
        "topic": "Graph Theory",
        "subtopics": ["BFS", "DFS", "Shortest Path", "Spanning Tree", "Adjacency Matrix"],
        "content": """Graph Theory for GATE DS.

Definitions:
  Graph G = (V, E). Directed (digraph) or undirected.
  Degree of vertex: number of edges. In directed: in-degree + out-degree.
  Path: sequence of vertices connected by edges.
  Cycle: path that starts and ends at same vertex.
  Connected graph: path exists between every pair of vertices.
  DAG: Directed Acyclic Graph.

Representations:
  Adjacency Matrix: A[i][j] = 1 if edge (i,j) exists. Space: O(V²).
  Adjacency List: List of neighbors for each vertex. Space: O(V+E).
  For sparse graphs: adjacency list preferred.

Graph Traversal:
  BFS (Breadth-First Search): Uses queue. O(V+E). Finds shortest path (unweighted).
  DFS (Depth-First Search): Uses stack/recursion. O(V+E). Topological sort, cycle detection.

Shortest Path:
  Dijkstra's: Single-source, non-negative weights. O((V+E)log V) with priority queue.
  Bellman-Ford: Negative weights allowed. O(VE). Detects negative cycles.
  Floyd-Warshall: All-pairs shortest path. O(V³).

Minimum Spanning Tree (MST):
  Kruskal's: Sort edges by weight, add if no cycle (Union-Find). O(E log E).
  Prim's: Start from vertex, greedily add minimum-weight edge. O(E log V).

Topological Sort: Linear ordering of DAG vertices. DFS-based or Kahn's algorithm.

Graph in ML: Node classification, link prediction, Graph Neural Networks (GNNs).""",
    },

    # ── PROBABILITY ──────────────────────────────────────────────
    {
        "subject": "Probability",
        "topic": "Random Variables and Expectation",
        "subtopics": ["Expected Value", "Variance", "Covariance", "MGF", "CLT", "Markov Chains"],
        "content": """Random Variables, Expectation, and Key Theorems.

Random Variable (RV): Function mapping sample space to real numbers.
  Discrete RV: PMF P(X=x). Continuous RV: PDF f(x), P(a≤X≤b) = ∫f(x)dx.

Expectation (Mean): E[X] = Σx·P(X=x) or ∫x·f(x)dx.
  Linearity: E[aX+bY] = aE[X]+bE[Y]. Always holds.
  E[g(X)] ≠ g(E[X]) in general (Jensen's inequality).

Variance: Var(X) = E[(X-μ)²] = E[X²] - (E[X])².
  Var(aX+b) = a²Var(X). Var(X+Y) = Var(X)+Var(Y)+2Cov(X,Y).
  For independent X,Y: Var(X+Y) = Var(X)+Var(Y).

Covariance: Cov(X,Y) = E[(X-μₓ)(Y-μᵧ)] = E[XY] - E[X]E[Y].
  Correlation: ρ = Cov(X,Y)/(σₓσᵧ) ∈ [-1,1].
  Independent → Cov=0 (but Cov=0 ↛ independent).

Law of Large Numbers (LLN): X̄ₙ →p μ as n→∞.
Central Limit Theorem (CLT): √n(X̄ₙ-μ)/σ →d N(0,1) as n→∞.
  Regardless of original distribution (finite mean and variance).

Moment Generating Function (MGF): M_X(t) = E[eᵗˣ].
  kth moment: E[Xᵏ] = M_X^(k)(0).
  If MGFs equal, distributions equal.

Markov Chains:
  Memoryless: P(Xₙ₊₁=j|X₀,...,Xₙ) = P(Xₙ₊₁=j|Xₙ).
  Transition matrix: P where Pᵢⱼ = P(next state j | current state i).
  Stationary distribution π: πP = π, Ση πᵢ = 1.
  Ergodic chains → unique stationary distribution (PageRank uses this).""",
    },

    # ── PROGRAMMING / ALGORITHMS ──────────────────────────────────
    {
        "subject": "Algorithms",
        "topic": "Complexity Analysis",
        "subtopics": ["Big O", "Time Complexity", "Space Complexity", "Recurrence", "Master Theorem"],
        "content": """Algorithm Analysis and Complexity.

Big-O Notation: Upper bound on growth rate.
  O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)

Common Complexities:
  Binary search: O(log n). Linear search: O(n).
  Merge sort: O(n log n). Quicksort: O(n log n) avg, O(n²) worst.
  Bubble/Insertion/Selection sort: O(n²).
  Dijkstra's: O((V+E)log V). BFS/DFS: O(V+E).
  Matrix multiplication (naive): O(n³). Strassen: O(n^2.81).

Recurrence Relations:
  Merge Sort: T(n) = 2T(n/2) + O(n) → O(n log n)
  Binary Search: T(n) = T(n/2) + O(1) → O(log n)

Master Theorem: T(n) = aT(n/b) + f(n). Compare f(n) with n^(log_b a).
  Case 1: f(n) = O(n^(log_b a - ε)) → T(n) = Θ(n^(log_b a))
  Case 2: f(n) = Θ(n^(log_b a)) → T(n) = Θ(n^(log_b a) log n)
  Case 3: f(n) = Ω(n^(log_b a + ε)) → T(n) = Θ(f(n))

Dynamic Programming:
  Overlapping subproblems + optimal substructure.
  Memoization (top-down) or tabulation (bottom-up).
  Classic problems: Fibonacci, Knapsack, LCS, LIS, Edit Distance.

Greedy Algorithms: Make locally optimal choice at each step.
  Correct for: Activity Selection, Fractional Knapsack, Huffman Coding, Kruskal's MST.
  NOT always optimal: 0/1 Knapsack.

NP-Completeness:
  P: Solvable in polynomial time.
  NP: Verifiable in polynomial time.
  NP-Complete: NP + NP-Hard (Traveling Salesman, SAT, 3-Coloring).""",
    },
    {
        "subject": "Programming",
        "topic": "Python for Data Science",
        "subtopics": ["NumPy", "Pandas", "List Comprehensions", "Generators", "OOP"],
        "content": """Python Programming for Data Science.

NumPy Essentials:
  np.array([1,2,3]), np.zeros((m,n)), np.ones((m,n)), np.eye(n)
  Broadcasting: operations on arrays of different shapes (aligns from right).
  np.dot(A,B) or A@B for matrix multiplication.
  np.linalg.eig(A), np.linalg.svd(A), np.linalg.inv(A), np.linalg.det(A)
  Vectorization: avoid loops → use numpy operations (100x faster).

Pandas Essentials:
  df.head(), df.describe(), df.info(), df.shape, df.dtypes
  df['col'], df.loc[row, col], df.iloc[i, j]
  df.groupby('col').agg({'val': 'mean'})
  df.merge(df2, on='key', how='inner/left/right/outer')
  df.pivot_table(values, index, columns, aggfunc)
  df.dropna(), df.fillna(), df.apply(func)

Data Types and Structures:
  List: mutable, ordered. Tuple: immutable. Dict: key-value O(1) lookup. Set: unique, O(1) lookup.
  List comprehension: [f(x) for x in lst if cond]
  Dict comprehension: {k: v for k, v in items}

Generators: yield keyword. Lazy evaluation. Memory-efficient for large data.
  gen = (x² for x in range(1000000))  # doesn't compute all at once

OOP in Python:
  class, __init__, self, inheritance, @classmethod, @staticmethod, @property
  Dunder methods: __str__, __repr__, __len__, __iter__, __getitem__

Complexity of Python operations:
  list append: O(1) amortized. list insert: O(n). dict get/set: O(1) avg.
  sorted(): O(n log n) Timsort. list.sort(): in-place O(n log n).""",
    },

    # ── DATABASES ────────────────────────────────────────────────
    {
        "subject": "Databases",
        "topic": "SQL and Normalization",
        "subtopics": ["Joins", "Normalization", "ACID", "Indexing", "Transactions"],
        "content": """Databases — SQL, Normalization, and Transactions.

SQL Joins:
  INNER JOIN: Only matching rows in both tables.
  LEFT JOIN: All rows from left + matching from right (NULL if no match).
  RIGHT JOIN: All rows from right + matching from left.
  FULL OUTER JOIN: All rows from both tables.
  CROSS JOIN: Cartesian product (n×m rows).

Aggregate functions: COUNT, SUM, AVG, MAX, MIN. Used with GROUP BY.
  HAVING filters after grouping (vs WHERE before grouping).
  Window functions: RANK(), ROW_NUMBER(), LAG(), LEAD(), PARTITION BY.

Normalization (reducing redundancy and anomalies):
  1NF: Atomic values, no repeating groups.
  2NF: 1NF + No partial dependency (non-key attribute depends on whole PK).
  3NF: 2NF + No transitive dependency (non-key → non-key).
  BCNF: For every FD X→Y, X must be a superkey. Stricter than 3NF.
  Denormalization: Intentional redundancy for performance.

Functional Dependencies (FDs):
  X → Y: knowing X determines Y.
  Armstrong's Axioms: Reflexivity, Augmentation, Transitivity.
  Closure of attribute set X⁺: all attributes determined by X.
  Minimal cover: irreducible set of FDs.

ACID Properties (Transactions):
  Atomicity: All or nothing.
  Consistency: DB moves from one valid state to another.
  Isolation: Concurrent transactions don't interfere.
  Durability: Committed data persists.

Indexing:
  B-tree: Default index. O(log n) search/insert/delete.
  Hash index: O(1) exact match. No range queries.
  Primary index vs Secondary (non-clustered) index.
  Index trade-off: faster reads, slower writes, extra storage.

CAP Theorem (NoSQL): Consistency, Availability, Partition Tolerance — choose 2.""",
    },
]


# ══════════════════════════════════════════════════════════════════
# INSERTION SCRIPT
# ══════════════════════════════════════════════════════════════════

def run_seed():
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # ✅ use service key

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    log.info("🔗 Connecting to Supabase...")
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)  # ✅ bypasses RLS

    log.info("🤖 Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    log.info("✅ Model loaded. Embedding dimension: 384")

    inserted = 0
    skipped = 0
    failed = 0

    log.info(f"📚 Processing {len(SYLLABUS_CHUNKS)} syllabus chunks...")

    for i, chunk in enumerate(SYLLABUS_CHUNKS, 1):
        subject = chunk["subject"]
        topic = chunk["topic"]
        content = chunk["content"]

        log.info(f"  [{i}/{len(SYLLABUS_CHUNKS)}] {subject} → {topic}")

        # ── 1. Check if chunk already exists ──────────────────────
        try:
            existing = (
                db.table("syllabus_chunks")
                .select("id")
                .eq("subject", subject)
                .eq("topic", topic)
                .execute()
            )
            if existing.data:
                log.info(f"      ⏭  Already exists, skipping.")
                skipped += 1
                continue
        except Exception as e:
            log.warning(f"      ⚠  Could not check existence: {e}")

        # ── 2. Generate embedding ─────────────────────────────────
        try:
            # Embed subject + topic + content for richer semantic search
            embed_text = f"{subject}. {topic}. {content}"
            embedding = model.encode(embed_text, normalize_embeddings=True).tolist()
            log.info(f"      ✅ Embedding generated ({len(embedding)} dims)")
        except Exception as e:
            log.error(f"      ❌ Embedding failed: {e}")
            failed += 1
            continue

        # ── 3. Insert into Supabase ───────────────────────────────
        try:
            row = {
                "subject": subject,
                "topic": topic,
                "content": content,
                "subtopics": chunk.get("subtopics", []),
                "embedding": embedding,          # Supabase accepts list[float] for vector column
            }
            result = db.table("syllabus_chunks").insert(row).execute()

            if result.data:
                log.info(f"      ✅ Inserted! ID: {result.data[0]['id']}")
                inserted += 1
            else:
                log.warning(f"      ⚠  No data returned from insert")
                failed += 1
        except Exception as e:
            log.error(f"      ❌ Insert failed: {e}")
            failed += 1

        # Small delay to avoid rate limiting
        time.sleep(0.2)

    # ── Summary ────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info(f"🎉 Seeding complete!")
    log.info(f"   ✅ Inserted : {inserted}")
    log.info(f"   ⏭  Skipped  : {skipped}")
    log.info(f"   ❌ Failed   : {failed}")
    log.info(f"   📊 Total    : {len(SYLLABUS_CHUNKS)}")
    log.info("=" * 60)

    if inserted > 0:
        log.info("🚀 Your RAG pipeline is ready! Doubts will now be context-aware.")

    # ── Verify with a test query ───────────────────────────────────
    log.info("\n🔍 Running verification query...")
    try:
        test_embedding = model.encode("explain Supervised_Learning", normalize_embeddings=True).tolist()
        result = db.rpc("match_syllabus_chunks", {
            "query_embedding": test_embedding,
            "match_count": 2,
        }).execute()
        if result.data:
            log.info("✅ Vector search working! Top result:")
            for r in result.data[:2]:
                log.info(f"   → [{r.get('subject')}] {r.get('topic')} (similarity: {r.get('similarity', 0):.3f})")
        else:
            log.warning("⚠  Vector search returned no results (check pgvector extension & schema)")
    except Exception as e:
        log.warning(f"⚠  Verification query failed: {e}")
        log.warning("   Make sure you've run supabase_schema.sql first!")


if __name__ == "__main__":
    run_seed()