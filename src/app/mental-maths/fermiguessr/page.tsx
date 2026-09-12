import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { FermiGuessrClient } from "./FermiGuessrClient";

const TITLE = "Fermi Estimation Game | ESAT Estimation Practice";
const DESCRIPTION =
  "Practise order-of-magnitude estimation for the no-calculator ESAT. Guess the size of an answer before doing the arithmetic.";

/** Interactive game shell: keep the route, but do not index it. */
export const metadata: Metadata = buildNoIndexMetadata({
  title: TITLE,
  description: DESCRIPTION,
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
