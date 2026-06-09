export type Subject =
  | 'Mathematics'
  | 'Statistics'
  | 'Machine Learning'
  | 'Deep Learning'
  | 'Data Science'
  | 'Programming'
  | 'Linear Algebra'
  | 'Probability'
  | 'Algorithms'
  | 'Databases'
  | 'Artificial Intelligence'
  | 'General Aptitude'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type SourceType = 'PYQ' | 'Generated' | 'Custom'

// ===== API Response Types =====
export interface APIResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ===== Syllabus =====
export interface SyllabusChunk {
  id: string
  subject: Subject
  topic: string
  content: string
  subtopics?: string[]
}

export const GATE_DA_SUBJECTS: Subject[] = [
  'Mathematics',
  'Statistics',
  'Machine Learning',
  'Deep Learning',
  'Data Science',
  'Programming',
  'Linear Algebra',
  'Probability',
  'Algorithms',
  'Databases',
  'Artificial Intelligence',
  'General Aptitude',
]

export const SUBJECT_TOPICS: Record<Subject, string[]> = {
  Mathematics: ['Calculus', 'Optimization', 'Graph Theory', 'Set Theory', 'Number Theory'],
  Statistics: ['Probability Distributions', 'Hypothesis Testing', 'Regression Analysis', 'Bayesian Statistics', 'ANOVA'],
  'Machine Learning': ['Supervised Learning', 'Unsupervised Learning', 'SVM', 'Decision Trees', 'Ensemble Methods', 'Feature Engineering'],
  'Deep Learning': ['Neural Networks', 'CNNs', 'RNNs', 'Transformers', 'GANs', 'Autoencoders'],
  'Data Science': ['Data Preprocessing', 'EDA', 'Feature Selection', 'Model Evaluation', 'Cross Validation'],
  Programming: ['Python', 'NumPy', 'Pandas', 'Algorithm Design', 'Data Structures', 'Complexity Analysis'],
  'Linear Algebra': ['Matrices', 'Eigenvalues', 'SVD', 'PCA', 'Vector Spaces', 'Linear Transformations'],
  Probability: ['Random Variables', 'Distributions', 'Expectation', 'Central Limit Theorem', 'Markov Chains'],
  Algorithms: ['Sorting', 'Searching', 'Dynamic Programming', 'Graph Algorithms', 'Greedy Algorithms'],
  Databases: ['SQL', 'NoSQL', 'Normalization', 'Transactions', 'Query Optimization', 'Indexing'],
  'Artificial Intelligence': ['Search', 'Logic', 'Reasoning', 'Planning', 'Knowledge Representation'],
  'General Aptitude': ['Verbal Ability', 'Quantitative Aptitude', 'Analytical Aptitude', 'Spatial Aptitude'],
}

export const SUBJECT_COLORS: Record<Subject, string> = {
  Mathematics: '#a855f7',
  Statistics: '#06b6d4',
  'Machine Learning': '#10b981',
  'Deep Learning': '#f59e0b',
  'Data Science': '#3b82f6',
  Programming: '#ec4899',
  'Linear Algebra': '#8b5cf6',
  Probability: '#14b8a6',
  Algorithms: '#f97316',
  Databases: '#6366f1',
  'Artificial Intelligence': '#10b981',
  'General Aptitude': '#f59e0b',
}
