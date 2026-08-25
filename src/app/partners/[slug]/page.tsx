import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { createPartnerServiceClient } from "@/lib/partners/service";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return buildNoIndexMetadata({
    title: `Partner access · ${params.slug}`,
  });
}

export default async function PartnerLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const service = createPartnerServiceClient();
  const { data: partner } = await service
    .from("partners")
    .select("slug, display_name, status, access_ends_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!partner || partner.status === "ended") {
    notFound();
  }

  const ends = new Date(partner.access_ends_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-[70vh] py-16">
      <Container size="sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Complimentary ESAT Camp access for {partner.display_name} students
        </h1>
        <p className="mt-4 text-stone-600">
          If your organisation invited you to ESAT Camp, use the unique
          invitation link they sent you. Each link works once and cannot be
          shared.
        </p>
        <p className="mt-3 text-stone-600">
          Access through this programme is available until {ends}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/access"
            className="inline-flex justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white"
          >
            Enter invitation code
          </Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex justify-center rounded-lg bg-stone-100 px-5 py-3 text-sm font-medium text-stone-900"
          >
            Sign up
          </Link>
        </div>
        <p className="mt-10 text-xs text-stone-400">
          This page does not verify eligibility. Redemption requires your
          personal invitation.
        </p>
      </Container>
    </main>
  );
}
