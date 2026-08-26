import { redirect } from "next/navigation";
import { DashboardPageContent } from "@/components/homepage/DashboardPageContent";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/onboarding/redirect";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildReturnPath(
  searchParams?: Record<string, string | string[] | undefined>,
): string {
  if (!searchParams || Object.keys(searchParams).length === 0) {
    return DEFAULT_POST_AUTH_PATH;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  const query = params.toString();
  return query ? `${DEFAULT_POST_AUTH_PATH}?${query}` : DEFAULT_POST_AUTH_PATH;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    const returnPath = buildReturnPath(searchParams);
    redirect(
      `/login?redirectTo=${encodeURIComponent(returnPath)}`,
    );
  }

  return <DashboardPageContent />;
}
