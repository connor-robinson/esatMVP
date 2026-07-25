"use client";

import { useRouter } from "next/navigation";
import { FermiGame } from "@/components/fermi/FermiGame";

export function FermiGuessrClient() {
  const router = useRouter();

  return <FermiGame onExit={() => router.push("/mental-maths/drill")} />;
}
