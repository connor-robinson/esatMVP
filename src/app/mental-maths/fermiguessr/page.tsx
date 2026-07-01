"use client";

import { useRouter } from "next/navigation";
import { FermiGame } from "@/components/fermi/FermiGame";

export default function FermiGuessrPage() {
  const router = useRouter();

  return <FermiGame onExit={() => router.push("/mental-maths/drill")} />;
}
