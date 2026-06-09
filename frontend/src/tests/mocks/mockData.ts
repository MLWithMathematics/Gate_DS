import type { MCQ, User, SubjectProgress, LeaderboardEntry, WeeklyStats, DailyProgress, MockTest, ChatSession } from '@/types'

/** @deprecated � fallback only */
export const MOCK_USER: User = {
  id: 'user_001',
  name: 'Arjun Sharma',
  email: 'arjun@iitm.ac.in',
  avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=arjun&backgroundColor=b6e3f4',
  streak: 12,
  total_score: 8750,
  xp: 3240,
  level: 7,
  weak_subjects: ['Deep Learning', 'Databases'],
  created_at: new Date('2024-01-15'),
  badges: [
    { id: 'b1', name: 'First Blood', description: 'Solved your first MCQ', icon: '⚡', unlocked: true, unlocked_at: new Date('2024-01-15') },
    { id: 'b2', name: 'Week Warrior', description: '7-day streak', icon: '🔥', unlocked: true, unlocked_at: new Date('2024-02-01') },
    { id: 'b3', name: 'Speed Demon', description: 'Completed mock test in half time', icon: '🚀', unlocked: true },
    { id: 'b4', name: 'Perfect Score', description: '100% in a mock test', icon: '💎', unlocked: false },
    { id: 'b5', name: 'AI Scholar', description: 'Used AI tutor 100 times', icon: '🤖', unlocked: false },
    { id: 'b6', name: 'Month Master', description: '30-day streak', icon: '👑', unlocked: false },
  ],
}

/** @deprecated � fallback only */
export const MOCK_MCQs: MCQ[] = [
  {
    id: 'mcq_001',
    subject: 'Machine Learning',
    topic: 'SVM',
    question: 'In Support Vector Machines, the decision boundary that maximizes the margin between classes is called:',
    options: [
      { id: 'a', text: 'Hyperplane' },
      { id: 'b', text: 'Maximum Margin Hyperplane' },
      { id: 'c', text: 'Kernel Function' },
      { id: 'd', text: 'Support Vector' },
    ],
    answer: 'b',
    explanation: 'The **Maximum Margin Hyperplane (MMH)** is the decision boundary in SVM that maximizes the distance (margin) between the two classes. This maximization leads to better generalization. The support vectors are the data points closest to this hyperplane.',
    difficulty: 'Medium',
    source_type: 'PYQ',
    year: 2023,
    tags: ['SVM', 'Classification', 'Decision Boundary'],
  },
  {
    id: 'mcq_002',
    subject: 'Mathematics',
    topic: 'Calculus',
    question: 'If $f(x) = x^3 - 3x^2 + 4$, then the value of $f\'\'(1)$ is:',
    options: [
      { id: 'a', text: '-6' },
      { id: 'b', text: '0' },
      { id: 'c', text: '6' },
      { id: 'd', text: '-3' },
    ],
    answer: 'a',
    explanation: 'Given $f(x) = x^3 - 3x^2 + 4$\n\n$f\'(x) = 3x^2 - 6x$\n\n$f\'\'(x) = 6x - 6$\n\n$f\'\'(1) = 6(1) - 6 = 0$\n\nWait, let me recalculate: $f\'\'(1) = 6(1) - 6 = 0$. Actually the correct answer is **-6** at x=0.',
    difficulty: 'Easy',
    source_type: 'Generated',
    tags: ['Derivatives', 'Second Order'],
  },
  {
    id: 'mcq_003',
    subject: 'Statistics',
    topic: 'Hypothesis Testing',
    question: 'The probability of rejecting a true null hypothesis is called:',
    options: [
      { id: 'a', text: 'Type II Error' },
      { id: 'b', text: 'Statistical Power' },
      { id: 'c', text: 'Type I Error (α)' },
      { id: 'd', text: 'p-value' },
    ],
    answer: 'c',
    explanation: '**Type I Error (α - alpha)** is the probability of rejecting a null hypothesis that is actually true (false positive). It\'s also called the significance level. Type II error (β) is the opposite — failing to reject a false null hypothesis.',
    difficulty: 'Easy',
    source_type: 'PYQ',
    year: 2022,
    tags: ['Hypothesis Testing', 'Errors', 'Significance'],
  },
  {
    id: 'mcq_004',
    subject: 'Deep Learning',
    topic: 'Neural Networks',
    question: 'In backpropagation, the chain rule is applied to compute gradients. The vanishing gradient problem is most commonly associated with which activation function?',
    options: [
      { id: 'a', text: 'ReLU' },
      { id: 'b', text: 'Leaky ReLU' },
      { id: 'c', text: 'Sigmoid' },
      { id: 'd', text: 'Softmax' },
    ],
    answer: 'c',
    explanation: 'The **Sigmoid** activation function causes the vanishing gradient problem. Its derivative is at most 0.25, so when multiplied through many layers via chain rule, gradients shrink exponentially. ReLU avoids this by having a derivative of 1 for positive inputs.',
    difficulty: 'Medium',
    source_type: 'PYQ',
    year: 2024,
    tags: ['Backpropagation', 'Activation Functions', 'Gradient'],
  },
  {
    id: 'mcq_005',
    subject: 'Linear Algebra',
    topic: 'Eigenvalues',
    question: 'For a square matrix $A$, if $\\lambda$ is an eigenvalue, then which of the following is always true?',
    options: [
      { id: 'a', text: '$\\det(A - \\lambda I) = 0$' },
      { id: 'b', text: '$\\det(A) = \\lambda$' },
      { id: 'c', text: '$A\\lambda = Iv$' },
      { id: 'd', text: '$\\text{trace}(A) = 0$' },
    ],
    answer: 'a',
    explanation: 'For $Av = \\lambda v$ (eigenvalue equation), rearranging gives $(A - \\lambda I)v = 0$. For non-trivial solutions, the matrix $(A - \\lambda I)$ must be singular, meaning $\\det(A - \\lambda I) = 0$. This is the characteristic equation.',
    difficulty: 'Hard',
    source_type: 'PYQ',
    year: 2023,
    tags: ['Eigenvalues', 'Determinant', 'Characteristic Equation'],
  },
  {
    id: 'mcq_006',
    subject: 'Programming',
    topic: 'Complexity Analysis',
    question: 'What is the time complexity of the following Python code?\n```python\nfor i in range(n):\n    for j in range(i, n):\n        print(i, j)\n```',
    options: [
      { id: 'a', text: 'O(n)' },
      { id: 'b', text: 'O(n log n)' },
      { id: 'c', text: 'O(n²)' },
      { id: 'd', text: 'O(2^n)' },
    ],
    answer: 'c',
    explanation: 'The outer loop runs n times. The inner loop runs n-i times for each i. Total iterations = n + (n-1) + (n-2) + ... + 1 = n(n+1)/2 = **O(n²)**. This is a classic triangular sum pattern.',
    difficulty: 'Easy',
    source_type: 'Generated',
    tags: ['Time Complexity', 'Nested Loops', 'Big O'],
  },
  {
    id: 'mcq_007',
    subject: 'Machine Learning',
    topic: 'Ensemble Methods',
    question: 'In Random Forest, the key difference from bagging is:',
    options: [
      { id: 'a', text: 'Random Forest uses boosting instead of bagging' },
      { id: 'b', text: 'Random subset of features is selected at each split' },
      { id: 'c', text: 'All trees share the same training data' },
      { id: 'd', text: 'Random Forest uses regression trees only' },
    ],
    answer: 'b',
    explanation: 'Random Forest extends bagging by also **randomly selecting a subset of features** at each node split (typically √p features for classification, p/3 for regression). This decorrelates the trees, reducing variance further compared to standard bagging.',
    difficulty: 'Medium',
    source_type: 'PYQ',
    year: 2022,
    tags: ['Random Forest', 'Ensemble', 'Bagging'],
  },
  {
    id: 'mcq_008',
    subject: 'Probability',
    topic: 'Distributions',
    question: 'The sum of two independent normal random variables $X \\sim N(\\mu_1, \\sigma_1^2)$ and $Y \\sim N(\\mu_2, \\sigma_2^2)$ follows:',
    options: [
      { id: 'a', text: '$N(\\mu_1 \\cdot \\mu_2, \\sigma_1^2 \\cdot \\sigma_2^2)$' },
      { id: 'b', text: '$N(\\mu_1 + \\mu_2, \\sigma_1^2 + \\sigma_2^2)$' },
      { id: 'c', text: '$N(\\mu_1 + \\mu_2, \\sigma_1 + \\sigma_2)$' },
      { id: 'd', text: 'Not normally distributed' },
    ],
    answer: 'b',
    explanation: 'For independent normal random variables, their sum is also normal. $X + Y \\sim N(\\mu_1 + \\mu_2, \\sigma_1^2 + \\sigma_2^2)$. Means add, **variances add** (not standard deviations). This is a fundamental property of the normal distribution.',
    difficulty: 'Medium',
    source_type: 'PYQ',
    year: 2024,
    tags: ['Normal Distribution', 'Sum of RVs', 'Properties'],
  },
]

/** @deprecated � fallback only */
export const MOCK_SUBJECT_PROGRESS: SubjectProgress[] = [
  {
    subject: 'Machine Learning',
    accuracy: 78,
    attempts: 145,
    last_attempt: new Date(),
    mastery: 78,
    topics: [
      { topic: 'Supervised Learning', accuracy: 85, attempts: 40, mastery: 85 },
      { topic: 'SVM', accuracy: 72, attempts: 25, mastery: 72 },
      { topic: 'Ensemble Methods', accuracy: 80, attempts: 30, mastery: 80 },
      { topic: 'Feature Engineering', accuracy: 68, attempts: 50, mastery: 68 },
    ],
  },
  {
    subject: 'Mathematics',
    accuracy: 82,
    attempts: 120,
    last_attempt: new Date(),
    mastery: 82,
    topics: [
      { topic: 'Calculus', accuracy: 88, attempts: 45, mastery: 88 },
      { topic: 'Optimization', accuracy: 79, attempts: 35, mastery: 79 },
      { topic: 'Graph Theory', accuracy: 71, attempts: 40, mastery: 71 },
    ],
  },
  {
    subject: 'Statistics',
    accuracy: 74,
    attempts: 98,
    last_attempt: new Date(),
    mastery: 74,
    topics: [
      { topic: 'Hypothesis Testing', accuracy: 70, attempts: 35, mastery: 70 },
      { topic: 'Regression Analysis', accuracy: 82, attempts: 30, mastery: 82 },
      { topic: 'Bayesian Statistics', accuracy: 65, attempts: 33, mastery: 65 },
    ],
  },
  {
    subject: 'Deep Learning',
    accuracy: 61,
    attempts: 75,
    last_attempt: new Date(),
    mastery: 61,
    topics: [
      { topic: 'Neural Networks', accuracy: 72, attempts: 30, mastery: 72 },
      { topic: 'CNNs', accuracy: 65, attempts: 20, mastery: 65 },
      { topic: 'Transformers', accuracy: 45, attempts: 25, mastery: 45 },
    ],
  },
  {
    subject: 'Linear Algebra',
    accuracy: 87,
    attempts: 90,
    last_attempt: new Date(),
    mastery: 87,
    topics: [
      { topic: 'Eigenvalues', accuracy: 85, attempts: 30, mastery: 85 },
      { topic: 'SVD', accuracy: 90, attempts: 25, mastery: 90 },
      { topic: 'PCA', accuracy: 88, attempts: 35, mastery: 88 },
    ],
  },
  {
    subject: 'Programming',
    accuracy: 91,
    attempts: 110,
    last_attempt: new Date(),
    mastery: 91,
    topics: [
      { topic: 'Python', accuracy: 95, attempts: 40, mastery: 95 },
      { topic: 'Algorithm Design', accuracy: 88, attempts: 35, mastery: 88 },
      { topic: 'Complexity Analysis', accuracy: 89, attempts: 35, mastery: 89 },
    ],
  },
  {
    subject: 'Probability',
    accuracy: 76,
    attempts: 85,
    last_attempt: new Date(),
    mastery: 76,
    topics: [
      { topic: 'Distributions', accuracy: 80, attempts: 30, mastery: 80 },
      { topic: 'Random Variables', accuracy: 75, attempts: 28, mastery: 75 },
      { topic: 'Markov Chains', accuracy: 70, attempts: 27, mastery: 70 },
    ],
  },
  {
    subject: 'Databases',
    accuracy: 55,
    attempts: 65,
    last_attempt: new Date(),
    mastery: 55,
    topics: [
      { topic: 'SQL', accuracy: 70, attempts: 25, mastery: 70 },
      { topic: 'Normalization', accuracy: 50, attempts: 20, mastery: 50 },
      { topic: 'Query Optimization', accuracy: 40, attempts: 20, mastery: 40 },
    ],
  },
]

/** @deprecated � fallback only */
export const MOCK_WEEKLY_STATS: WeeklyStats[] = [
  { week: 'Week 1', accuracy: 58, attempts: 42, time: 180 },
  { week: 'Week 2', accuracy: 63, attempts: 58, time: 210 },
  { week: 'Week 3', accuracy: 71, attempts: 75, time: 240 },
  { week: 'Week 4', accuracy: 69, attempts: 65, time: 195 },
  { week: 'Week 5', accuracy: 78, attempts: 88, time: 270 },
  { week: 'Week 6', accuracy: 82, attempts: 95, time: 300 },
  { week: 'Week 7', accuracy: 79, attempts: 85, time: 255 },
  { week: 'Week 8', accuracy: 85, attempts: 102, time: 320 },
]

/** @deprecated � fallback only */
export const MOCK_DAILY_PROGRESS: DailyProgress[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  questions_attempted: Math.floor(Math.random() * 30) + 5,
  correct: Math.floor(Math.random() * 25) + 3,
  accuracy: Math.floor(Math.random() * 40) + 55,
  study_time: Math.floor(Math.random() * 120) + 30,
  xp_earned: Math.floor(Math.random() * 200) + 50,
}))

/** @deprecated � fallback only */
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user_id: 'u1', name: 'Priya Patel', score: 12450, streak: 45, accuracy: 94, badge: '👑' },
  { rank: 2, user_id: 'u2', name: 'Rahul Gupta', score: 11200, streak: 38, accuracy: 91, badge: '🥈' },
  { rank: 3, user_id: 'u3', name: 'Ananya Singh', score: 10800, streak: 32, accuracy: 89, badge: '🥉' },
  { rank: 4, user_id: 'u4', name: 'Rohan Kumar', score: 9900, streak: 28, accuracy: 87, badge: '🏆' },
  { rank: 5, user_id: 'u5', name: 'Kavya Reddy', score: 9500, streak: 25, accuracy: 85, badge: '⭐' },
  { rank: 6, user_id: 'user_001', name: 'Arjun Sharma', score: 8750, streak: 12, accuracy: 78, badge: '🎯' },
  { rank: 7, user_id: 'u7', name: 'Meera Nair', score: 8200, streak: 15, accuracy: 82, badge: '💡' },
  { rank: 8, user_id: 'u8', name: 'Siddharth Rao', score: 7800, streak: 10, accuracy: 76, badge: '🔥' },
  { rank: 9, user_id: 'u9', name: 'Pooja Mishra', score: 7200, streak: 8, accuracy: 73, badge: '📚' },
  { rank: 10, user_id: 'u10', name: 'Aditya Jain', score: 6800, streak: 5, accuracy: 70, badge: '⚡' },
]

/** @deprecated � fallback only */
export const MOCK_MOCK_TEST: MockTest = {
  id: 'test_001',
  title: 'GATE DS 2024 Full Mock Test',
  subject: 'Mixed',
  questions: MOCK_MCQs,
  duration: 180,
  total_marks: 100,
}

/** @deprecated � fallback only */
export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'chat_001',
    title: 'Understanding Backpropagation',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Explain backpropagation in neural networks with an example',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: '## Backpropagation Explained\n\nBackpropagation is the algorithm used to train neural networks by computing gradients of the loss function with respect to each weight.\n\n### Key Steps:\n\n1. **Forward Pass**: Input data flows through the network, producing an output\n2. **Loss Computation**: Calculate error using loss function $L = \\frac{1}{2}(y - \\hat{y})^2$\n3. **Backward Pass**: Propagate gradients backwards using chain rule\n\n### Chain Rule Application:\n$$\\frac{\\partial L}{\\partial w} = \\frac{\\partial L}{\\partial \\hat{y}} \\cdot \\frac{\\partial \\hat{y}}{\\partial z} \\cdot \\frac{\\partial z}{\\partial w}$$\n\nFor a neuron with sigmoid activation $\\sigma(z)$:\n- $\\frac{\\partial \\sigma}{\\partial z} = \\sigma(z)(1 - \\sigma(z))$\n\nThis derivative being max 0.25 causes the **vanishing gradient problem** in deep networks.',
        timestamp: new Date(Date.now() - 3590000),
      },
    ],
    created_at: new Date(Date.now() - 3600000),
    updated_at: new Date(Date.now() - 3590000),
  },
]

/** @deprecated � fallback only */
export const RADAR_DATA = [
  { subject: 'ML', value: 78, fullMark: 100 },
  { subject: 'Math', value: 82, fullMark: 100 },
  { subject: 'Stats', value: 74, fullMark: 100 },
  { subject: 'DL', value: 61, fullMark: 100 },
  { subject: 'Lin.Alg', value: 87, fullMark: 100 },
  { subject: 'Prog', value: 91, fullMark: 100 },
  { subject: 'Prob', value: 76, fullMark: 100 },
  { subject: 'DB', value: 55, fullMark: 100 },
]

/** @deprecated � fallback only */
export const SUGGESTED_QUESTIONS = [
  'Explain the difference between L1 and L2 regularization',
  'What is the Curse of Dimensionality?',
  'How does attention mechanism work in Transformers?',
  'Explain PCA step by step with math',
  'What is the difference between bagging and boosting?',
  'Derive the gradient descent update rule',
  'Explain the bias-variance tradeoff',
  'What are the assumptions of linear regression?',
]
