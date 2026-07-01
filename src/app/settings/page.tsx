import { redirect } from "next/navigation";

type SettingsPageProps = {
  searchParams?: { section?: string };
};

/**
 * Canonical URL for navbar Settings — account prefs live on `/profile`.
 */
export default function SettingsPage({ searchParams }: SettingsPageProps) {
  const section = searchParams?.section;
  if (section === "pricing") {
    redirect("/pricing?from=settings");
  }
  if (section) {
    redirect(`/profile?section=${encodeURIComponent(section)}`);
  }
  redirect("/profile");
}
