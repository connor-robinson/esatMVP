/**
 * Dev preview - full-screen loading UI only.
 *
 * Examples:
 *   /dev/loading
 *   /dev/loading?variant=session
 *   /dev/loading?message=Fetching%20questions…
 *   /dev/loading?hint=Your%20custom%20tip%20here
 */

import { LoadingPage, type LoadingPageVariant } from "@/components/shared/LoadingPage";

type LoadingPreviewPageProps = {
  searchParams?: {
    variant?: string;
    message?: string;
    hint?: string;
  };
};

function parseVariant(value: string | undefined): LoadingPageVariant {
  return value === "session" ? "session" : "app";
}

export default function LoadingPreviewPage({ searchParams }: LoadingPreviewPageProps) {
  return (
    <LoadingPage
      variant={parseVariant(searchParams?.variant)}
      message={searchParams?.message}
      hint={searchParams?.hint}
    />
  );
}
