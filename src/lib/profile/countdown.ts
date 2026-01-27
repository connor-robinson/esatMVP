/**
 * Utility functions for calculating exam countdown dates
 */

export type ExamType = 'ESAT' | 'TMUA';
export type ApplicantType = 'early' | 'late';

export interface ExamDate {
  examType: ExamType;
  applicantType: ApplicantType;
  date1: Date;
  date2: Date;
}

/**
 * Exam dates configuration
 */
const EXAM_DATES: Record<ExamType, Record<ApplicantType, { date1: string; date2: string }>> = {
  ESAT: {
    early: {
      date1: '2026-10-09',
      date2: '2026-10-10',
    },
    late: {
      date1: '2027-01-08',
      date2: '2027-01-09',
    },
  },
  TMUA: {
    early: {
      date1: '2026-10-13',
      date2: '2026-10-14',
    },
    late: {
      date1: '2027-01-06',
      date2: '2027-01-07',
    },
  },
};

/**
 * Get exam dates for a given exam type and applicant type
 */
export function getExamDates(examType: ExamType | null, isEarlyApplicant: boolean): ExamDate | null {
  if (!examType) return null;

  const applicantType: ApplicantType = isEarlyApplicant ? 'early' : 'late';
  const dates = EXAM_DATES[examType][applicantType];

  return {
    examType,
    applicantType,
    date1: new Date(dates.date1),
    date2: new Date(dates.date2),
  };
}

/**
 * Calculate days until exam (returns days until the first exam date)
 */
export function calculateDaysUntilExam(examType: ExamType | null, isEarlyApplicant: boolean): number | null {
  const examDates = getExamDates(examType, isEarlyApplicant);
  if (!examDates) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const examDate = examDates.date1;
  examDate.setHours(0, 0, 0, 0);

  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format exam date range as string
 */
export function formatExamDateRange(examType: ExamType | null, isEarlyApplicant: boolean): string | null {
  const examDates = getExamDates(examType, isEarlyApplicant);
  if (!examDates) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return `${formatDate(examDates.date1)} - ${formatDate(examDates.date2)}`;
}

/**
 * Get exam date display text
 */
export function getExamDateDisplay(examType: ExamType | null, isEarlyApplicant: boolean): string {
  if (!examType) return 'No exam selected';

  const dateRange = formatExamDateRange(examType, isEarlyApplicant);
  if (!dateRange) return 'No exam selected';

  return `${examType}: ${dateRange}`;
}

