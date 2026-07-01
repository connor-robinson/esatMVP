import { redirect } from "next/navigation";
import { FERMI_GUESSR_STATS_PATH } from "@/config/fermiGuessr";

export default function LegacyFermiStatsRedirect() {
  redirect(FERMI_GUESSR_STATS_PATH);
}
