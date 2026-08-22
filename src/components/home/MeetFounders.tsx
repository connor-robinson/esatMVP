import Image from "next/image";
import Link from "next/link";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";

function CompactFounder({
  founder,
  primary = false,
}: {
  founder: (typeof FOUNDERS)[keyof typeof FOUNDERS];
  primary?: boolean;
}) {
  return (
    <article
      className={`group grid overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0F1D]/60 transition-transform duration-300 hover:-translate-y-0.5 sm:grid-cols-[minmax(8.5rem,0.7fr)_minmax(0,1.3fr)] ${
        primary ? "lg:col-span-7" : "lg:col-span-5"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#161D2F] sm:aspect-auto sm:min-h-64">
        <Image
          src={founder.imageSrc}
          alt={founder.imageAlt}
          fill
          sizes={primary ? "(min-width: 1024px) 24vw, 100vw" : "(min-width: 1024px) 18vw, 100vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col justify-center p-6">
        <h3 className="font-display text-2xl font-bold tracking-tight text-white">
          {founder.name}
        </h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
          {founder.role}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
          {founder.homepageCredential}
        </p>
      </div>
    </article>
  );
}

export function MeetFounders() {
  return (
    <section
      id="about"
      className="scroll-mt-28 bg-[#0A0F1D] px-4 py-20 sm:px-5 sm:py-24 lg:px-6"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-14">
          <div>
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Meet our founders
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
              We created ESAT Camp to create the ESAT preparation platform that
              we wish we had.
            </p>
            <Link
              href={ABOUT_PATH}
              className="mt-5 inline-flex items-center gap-2 font-bold text-[#93C5FD] transition-colors hover:text-white"
            >
              Meet the team
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          <CompactFounder founder={FOUNDERS.ewan} primary />
          <CompactFounder founder={FOUNDERS.anson} />
        </div>
      </div>
    </section>
  );
}
