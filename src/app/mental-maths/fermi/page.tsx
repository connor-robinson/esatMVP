import { redirect } from "next/navigation";
import { FERMI_GUESSR_PLAY_PATH, FERMI_GUESSR_STATS_PATH } from "@/config/fermiGuessr";

export default function LegacyFermiPlayRedirect() {
  redirect(FERMI_GUESSR_PLAY_PATH);
}
