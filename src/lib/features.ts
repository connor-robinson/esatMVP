/**
 * Feature flags - Control which features are enabled in different environments
 */

/**
 * Check if question generation features should be enabled
 * Set NEXT_PUBLIC_ENABLE_QUESTION_GENERATION=true in Vercel for staging/preview
 * Leave unset or false for production
 * 
 * In development (local), this defaults to true for easier testing
 */
export function isQuestionGenerationEnabled(): boolean {
  try {
    // In development, enable by default for easier testing
    if (process.env.NODE_ENV === "development") {
      const value = process.env.NEXT_PUBLIC_ENABLE_QUESTION_GENERATION;
      // If explicitly set to false, respect that
      if (value === "false") {
        return false;
      }
      // Otherwise, default to true in development
      return true;
    }
    
    // In production/preview, check the environment variable
    const value = process.env.NEXT_PUBLIC_ENABLE_QUESTION_GENERATION;
    return value === "true";
  } catch (error) {
    // If there's any error, default based on environment
    console.warn("Error checking feature flag:", error);
    // In development, default to true; in production, default to false
    return process.env.NODE_ENV === "development";
  }
}

/**
 * Check if we're in a preview/staging environment
 * Vercel automatically sets VERCEL_ENV to 'preview' for preview deployments
 */
export function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || 
         (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview");
}

