/**
 * Optional first-hand reports from other ESAT candidates.
 * Do not render the public section until at least one entry has consent: true.
 */
export type EsatCandidateReport = {
  /** First name or initials only. */
  name: string;
  testYear: number;
  /** Pearson VUE centre or city. */
  centre: string;
  roughWorkSetup: string;
  quote: string;
  consent: boolean;
};

export const ESAT_CANDIDATE_REPORTS: readonly EsatCandidateReport[] = [];

export function getConsentedCandidateReports(): EsatCandidateReport[] {
  return ESAT_CANDIDATE_REPORTS.filter((report) => report.consent);
}
