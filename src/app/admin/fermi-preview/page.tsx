import { redirect } from "next/navigation";

/** Admin shortcut → game-shell preview (same FermiGuessr UI). */
export default function AdminFermiPreviewRedirect({
  searchParams,
}: {
  searchParams?: { batch?: string };
}) {
  const batch = searchParams?.batch === "01" ? "01" : "02";
  redirect(`/mental-maths/fermiguessr/preview?batch=${batch}`);
}
