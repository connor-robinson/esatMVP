import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams?: { redirectTo?: string; plan?: string };
};

/** Sign-up uses the same page as sign-in (email/password or Google). */
export default function SignupPage({ searchParams }: SignupPageProps) {
  const params = new URLSearchParams({ mode: "signup" });
  const redirectTo = searchParams?.redirectTo;
  const plan = searchParams?.plan;
  if (redirectTo) {
    params.set("redirectTo", redirectTo);
  }
  if (plan) {
    params.set("plan", plan);
  }
  redirect(`/login?${params.toString()}`);
}
