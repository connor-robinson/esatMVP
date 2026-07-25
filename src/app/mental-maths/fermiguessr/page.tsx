import type { Metadata } from "next";
import { APP_ROUTES, buildSeoMetadata } from "@/lib/seo/config";
import { FermiGuessrClient } from "./FermiGuessrClient";

const TITLE = "Fermi Estimation Game | ESAT Estimation Practice";
const DESCRIPTION =
  "Practise order-of-magnitude estimation for the no-calculator ESAT. Guess the size of an answer before doing the arithmetic.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: APP_ROUTES.fermiGame,
  keywords: [
    "Fermi estimation game",
    "ESAT estimation practice",
    "order of magnitude estimation",
    "ESAT mental maths",
  ],
});

export default function FermiGuessrPage() {
  return (
    <>
      {/* The game fills the viewport and carries no visible heading of its own. */}
      <h1 className="sr-only">Fermi estimation game for ESAT practice</h1>
      <FermiGuessrClient />
    </>
  );
}
