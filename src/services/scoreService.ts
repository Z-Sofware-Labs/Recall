export interface QuizScoreRecord {
  id: string;
  courseId: string;
  quizId: string;
  quizTitle: string;
  quizType: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  mistakeCount: number;
  attempts: number;
  timestamp: number;
  passed: boolean;
}

export interface CourseScoreTally {
  courseId: string;
  totalEarned: number;
  totalPossible: number;
  overallPercentage: number;
  completedCount: number;
  passingScoreThreshold: number; // e.g. 70%
  passedCourse: boolean;
  records: QuizScoreRecord[];
}

const STORAGE_KEY_PREFIX = 'recall_course_scores_';

export const scoreService = {
  getScoresForCourse(courseId: string): QuizScoreRecord[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${courseId}`);
      if (!raw) return [];
      return JSON.parse(raw) as QuizScoreRecord[];
    } catch {
      return [];
    }
  },

  recordQuizScore(
    data: {
      courseId: string;
      quizId: string;
      quizTitle: string;
      quizType: string;
      score: number;
      maxScore: number;
      correctCount: number;
      mistakeCount: number;
      attempts: number;
    },
    passingThresholdPercent = 70
  ): QuizScoreRecord {
    const percentage = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 100;
    const passed = data.maxScore === 0 ? true : percentage >= passingThresholdPercent;

    const newRecord: QuizScoreRecord = {
      ...data,
      id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      percentage,
      timestamp: Date.now(),
      passed,
    };

    const existing = this.getScoresForCourse(data.courseId);
    // Replace any previous attempt for the same quiz or append
    const filtered = existing.filter(r => r.quizId !== data.quizId);
    const updated = [...filtered, newRecord];

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${data.courseId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save score record to localStorage', e);
    }

    return newRecord;
  },

  getCourseScoreTally(courseId: string, passingThresholdPercent = 70): CourseScoreTally {
    const records = this.getScoresForCourse(courseId);

    const totalEarned = records.reduce((sum, r) => sum + r.score, 0);
    const totalPossible = records.reduce((sum, r) => sum + r.maxScore, 0);
    const overallPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    const passedCourse = records.length > 0 && overallPercentage >= passingThresholdPercent;

    return {
      courseId,
      totalEarned,
      totalPossible,
      overallPercentage,
      completedCount: records.length,
      passingScoreThreshold: passingThresholdPercent,
      passedCourse,
      records,
    };
  },

  clearScoresForCourse(courseId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${courseId}`);
    } catch (e) {
      console.error('Failed to clear course scores', e);
    }
  },
};
