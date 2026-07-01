import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams?: { redirectTo?: string };
};

/** Sign-up uses the same Google OAuth flow as sign-in. */
export default function SignupPage({ searchParams }: SignupPageProps) {
  const redirectTo = searchParams?.redirectTo;
  if (redirectTo) {
    redirect(
      `/login?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }
  redirect("/login?mode=signup");
}
