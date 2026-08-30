export type PublicSitemapEntry = {
  readonly path: string;
  /**
   * ISO date (YYYY-MM-DD) when page content was last substantively updated.
   * Omit when no reliable per-page date exists (do not use build or deploy time).
   */
  readonly lastModified?: string;
};
