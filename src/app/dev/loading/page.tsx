/**
 * Dev preview — full-screen loading UI only.
 *
 * Examples:
 *   /dev/loading
 *   /dev/loading?variant=session
 *   /dev/loading?variant=app&progress=72
 *   /dev/loading?message=Fetching%20questions…
 *   /dev/loading?hint=Your%20custom%20tip%20here
 */

import { LoadingPage, type LoadingPageVariant } from "@/components/shared/LoadingPage";

type LoadingPreviewPageProps = {
  searchParams?: {
    variant?: string;
    progress?: string;
    message?: string;
    hint?: string;
    steps?: string;
  };
};

function parseVariant(value: string | undefined): LoadingPageVariant {
  return value === "session" ? "session" : "app";
}

function parseProgress(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

export default function LoadingPreviewPage({ searchParams }: LoadingPreviewPageProps) {
  const variant = parseVariant(searchParams?.variant);
  const progress = parseProgress(searchParams?.progress);
  const showProgress = progress !== undefined || searchParams?.steps === "1";

  return (
    <LoadingPage
      variant={variant}
      message={searchParams?.message}
      hint={searchParams?.hint}
      showProgress={showProgress}
      progress={progress ?? (showProgress ? 42 : 0)}
    />
  );
}
