import { redirect } from "next/navigation";

/**
 * Canonical URL for navbar Settings — account prefs live on `/profile`.
 */
export default function SettingsPage() {
  redirect("/profile");
}
