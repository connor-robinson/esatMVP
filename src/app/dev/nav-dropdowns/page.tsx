import { NavDropdownPreviewLab } from "@/components/layout/navDropdownPreview/NavDropdownPreviewLab";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const metadata = buildNoIndexMetadata({
  title: "Nav dropdown preview",
});

/**
 * Sandbox for quieter navbar menus (no live chrome changes).
 * Open /dev/nav-dropdowns
 */
export default function DevNavDropdownsPage() {
  return <NavDropdownPreviewLab />;
}
