"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement email submission
    console.log("Email submitted:", email);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="scroll-smooth">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-32 overflow-hidden bg-[#0A0F1D]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-10">
              <h1 className="text-6xl lg:text-8xl font-display font-bold leading-[1.05] tracking-tight">
                Master the <span className="text-underline-accent">ESAT</span> &{" "}
                <br />
                <span className="text-underline-accent">TMUA</span>. Secure your{" "}
                <br />
                Cambridge offer.
              </h1>
              <p className="text-xl text-[#94A3B8] max-w-xl leading-relaxed">
                The non-calculator, high-pressure entrance exams demand more than
                just knowledge. Master the speed and strategy required for the
                2024-25 cycle.
              </p>
              <div className="max-w-md">
                <form
                  onSubmit={handleEmailSubmit}
                  className="flex p-1 bg-white/5 border border-white/10 rounded-xl focus-within:border-[#3B82F6]/50 transition-colors"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 py-3 placeholder:text-slate-500"
                    placeholder="Enter your email"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-white text-[#0A0F1D] px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-all"
                  >
                    Get early access
                  </button>
                </form>
              </div>
              <div className="flex gap-12 pt-8">
                <div>
                  <div className="text-3xl font-bold">3000+</div>
                  <div className="text-xs uppercase tracking-widest text-[#94A3B8] mt-1 font-semibold">
                    Questions
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold">98%</div>
                  <div className="text-xs uppercase tracking-widest text-[#94A3B8] mt-1 font-semibold">
                    Success Rate
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold">Expert</div>
                  <div className="text-xs uppercase tracking-widest text-[#94A3B8] mt-1 font-semibold">
                    Tutors
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#161D2F]">
                <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#94A3B8]">
                    Mental Maths Trainer
                  </div>
                </div>
                <div className="p-8 aspect-square flex flex-col justify-center items-center text-center space-y-8">
                  <div className="text-5xl font-mono text-[#3B82F6]">
                    √(144 * 25) / 5
                  </div>
                  <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-[#3B82F6]"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-2xl font-bold">
                      12
                    </div>
                    <div className="p-4 rounded-xl bg-[#3B82F6] text-white text-2xl font-bold shadow-lg shadow-[#3B82F6]/20">
                      60
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-6 backdrop-blur-md bg-white/10 rounded-xl border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    <Image
                      alt="Student"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9f3UOvm5kRvUKf-I9vO0XaI-50lP95_w_x_oDmj2YBSBlG-kg7K15gniuaDbk-CanmjwgxbAtwq4cVB7aaUXudb7Sq5RhadVTOdvxrV3tpIQu4mp4cd2CB-mmTrz3WTc8jNY4YKlHeHRL4qCGoqAGnYtsYMmZrI2OM7nc3XW-oLvHxCVaPExTcAVZO59r-bI1J3uEZTtZSRGfDGM6T8MkDDyVrFrmfEOQh5QDCII8mcCtKMwGogYqK0ygplTehIBa6p62ZEUsvrYo"
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white"
                    />
                    <Image
                      alt="Student"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqIPwQGM58zx4ffenKxTfp-r-5O6h9YHat2ZbJIa0YPgu9Va3tRXt7GKC6E8SEB_ZWDAdJG-mKfvrz9ciVjk3BPFwIXlefvVDLZhKaIvQXpxxnqpph3Y5Zgltd_2lGzplLrAVWVNtiSALb6tjrZ486EJjLVsOqfSIGvD-5v2dCYZF9AMZnSy6iGGlnfIRKgeaWaJOqN1nNWBzuKHYIfAD5_ntvUZl1HmsaaHKofbsaefXiL1RrPL9djQcF2GiC3AFf-sqdeHtpuVG1"
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white"
                    />
                    <Image
                      alt="Student"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUuxqj5-_OUeVQ2x-qG1flk3kawsv5vUwMmr1bJlmG_6014F8NUTfZCm3jVNxIhWZzNlP6SBMc2K5L45fr98I8qB_ZsxNhtRUV73srurAkWJ5TFmAjO5PCd9QjcEznnfQSQvLH8e2tNjSi807kZZ6dP88l8zJJkqqZLAlai2-8iuz6AwdnBtnx3cN7UPpVEjkE48FSUOIG4Uqgi59lbXOsljBYpzVHuCTgV_qB7C3da21lxk373jgrlVyfOMd1y81rvnZsHund57Fe"
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white"
                    />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">
                      Made by Cambridge students
                    </p>
                    <p className="text-white/80 text-xs">
                      Join 5,000+ applicants this cycle
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#3B82F6]/20 rounded-full blur-[100px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-[#161D2F] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6] mb-4">
              Why choose us
            </h2>
            <h3 className="text-4xl font-display font-bold">
              What do we offer?
            </h3>
            <p className="text-[#94A3B8]">
              Everything you need to master the rigorous assessment process of
              the world&apos;s most prestigious university.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Mental Maths Trainer Card */}
            <div className="p-8 rounded-2xl bg-[#0A0F1D]/40 border border-white/5 hover:border-[#3B82F6]/30 transition-all group flex flex-col">
              <div className="mb-6">
                <div className="w-14 h-14 bg-[#3B82F6]/20 rounded-xl flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">
                    calculate
                  </span>
                </div>
              </div>
              <h4 className="text-2xl font-display font-bold mb-3">
                Mental Maths Trainer
              </h4>
              <p className="text-[#94A3B8] mb-6">
                The ESAT & TMUA are non-calculator exams with heavy arithmetic.
                Get faster & better with our specialized trainer.
              </p>
              <div className="mt-auto rounded-lg bg-[#161D2F] p-4 mb-6 font-mono text-sm overflow-hidden border border-white/10">
                <div className="flex gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <p className="text-green-400">
                  Problem: <span className="text-white">√(144 * 25) / 5</span>
                </p>
                <p className="text-[#94A3B8] mt-1">
                  &gt; Input your answer...
                </p>
              </div>
              <Link
                href="/skills/drill"
                className="w-full py-3 border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Try Trainer{" "}
                <span className="material-symbols-outlined text-sm">bolt</span>
              </Link>
            </div>

            {/* Past Papers Card */}
            <div className="p-8 rounded-2xl bg-[#0A0F1D]/40 border border-white/5 hover:border-[#3B82F6]/30 transition-all group flex flex-col">
              <div className="mb-6">
                <div className="w-14 h-14 bg-[#3B82F6]/20 rounded-xl flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">
                    history_edu
                  </span>
                </div>
              </div>
              <h4 className="text-2xl font-display font-bold mb-3">
                Past Papers
              </h4>
              <p className="text-[#94A3B8] mb-6">
                Every single paper, planned & tracked. Know exactly where you
                stand with your percentile progress.
              </p>
              <div className="mt-auto space-y-3 mb-6">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="material-symbols-outlined text-[#3B82F6]">
                    check_circle
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="bg-[#3B82F6] h-full w-[85%]" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#94A3B8]">85%</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="material-symbols-outlined text-[#94A3B8]">
                    pending
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="bg-[#3B82F6]/20 h-full w-[20%]" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#94A3B8]">
                    Scheduled
                  </span>
                </div>
              </div>
              <Link
                href="/papers/library"
                className="w-full py-3 border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white font-bold rounded-xl transition-all"
              >
                View Planner
              </Link>
            </div>

            {/* Question Bank Card */}
            <div className="p-8 rounded-2xl bg-[#0A0F1D]/40 border border-white/5 hover:border-[#3B82F6]/30 transition-all group flex flex-col">
              <div className="mb-6">
                <div className="w-14 h-14 bg-[#3B82F6]/20 rounded-xl flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">
                    quiz
                  </span>
                </div>
              </div>
              <h4 className="text-2xl font-display font-bold mb-3">
                3000+ Practice Questions
              </h4>
              <p className="text-[#94A3B8] mb-6">
                Never run out of practice questions. Catered & created by
                Cambridge tutors specifically for these exams.
              </p>
              <div className="mt-auto relative rounded-xl border border-dashed border-white/20 p-6 mb-6 text-center">
                <span className="material-symbols-outlined text-4xl text-white/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  all_inclusive
                </span>
                <p className="text-4xl font-bold text-white relative z-10">
                  3,492
                </p>
                <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-tighter">
                  Questions in Bank
                </p>
              </div>
              <Link
                href="/questions/bank"
                className="w-full py-3 border border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white font-bold rounded-xl transition-all"
              >
                Start Question Bank
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process Clarification Section */}
      <section className="py-24 bg-[#0A0F1D]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 group aspect-video">
              <div className="relative w-full h-full">
                  <Image
                    alt="Cambridge University"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4XjyPtm2LZdqfaRrb0lGUc6DW6Ud6m3nZ52SX_w4ZxW5PteQ_UcU-NsvafF5Jfkleq_HuJf8uofvW0qrbf8kuQaVb6cu8TxxzP92dQ8YtzLfc6nBgEXHjEjG_3-lVVFNql7ilgu8uxp3GN8QuJgeiwelPu6KE8G2op5OHDFKxlywSoWW4t2c2-WG8wuUqT9y74M7kWDKO4LIjIiHw-U47Z9jfj4F8HhiO5gGGTzgtgkrjNSAA1LOSXoYa4JWNcdd1hg9V26amlFpP"
                    fill
                    className="object-cover grayscale opacity-50 group-hover:grayscale-0 transition-all duration-700"
                  />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    className="w-20 h-20 bg-white text-[#0A0F1D] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined text-4xl fill-current">
                      play_arrow
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-12">
              <div>
                <h2 className="text-4xl lg:text-5xl font-display font-bold mb-8">
                  We clarify the process
                </h2>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[#3B82F6]">
                      check_circle
                    </span>
                    <p className="text-[#94A3B8] text-lg">
                      We know that the application process can be overwhelming
                      and competitive. Our step-by-step framework removes the
                      guesswork.
                    </p>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-[#3B82F6]">
                      check_circle
                    </span>
                    <p className="text-[#94A3B8] text-lg">
                      You can spend more time focusing on your revision while we
                      handle the planning and logistical tracking of your
                      progress.
                    </p>
                  </li>
                </ul>
              </div>
              <div className="pt-8 border-t border-white/10">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  Free resources
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <a
                    href="#"
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#3B82F6]">
                        description
                      </span>
                      <span className="font-semibold text-sm">Exam Guide</span>
                    </div>
                    <span className="material-symbols-outlined text-sm">
                      arrow_downward
                    </span>
                  </a>
                  <a
                    href="#"
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#3B82F6]">
                        timeline
                      </span>
                      <span className="font-semibold text-sm">
                        Prep Timeline
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-sm">
                      arrow_downward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-[#161D2F]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#3B82F6] mb-4">
              Pricing
            </h2>
            <h3 className="text-4xl font-display font-bold">
              Invest in your future
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="p-10 rounded-3xl bg-[#0A0F1D] border border-white/10 flex flex-col">
              <h4 className="text-xl font-bold mb-2">Basic</h4>
              <div className="text-4xl font-bold mb-8">
                £49<span className="text-sm text-[#94A3B8] font-normal">/year</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-[#94A3B8] text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3B82F6] text-lg">
                    check
                  </span>{" "}
                  Mental Maths Trainer
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3B82F6] text-lg">
                    check
                  </span>{" "}
                  Past Paper Tracker
                </li>
                <li className="flex items-center gap-2 opacity-30">
                  <span className="material-symbols-outlined text-lg">close</span>{" "}
                  Advanced Question Bank
                </li>
              </ul>
              <button
                type="button"
                className="w-full py-4 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition-all"
              >
                Select Plan
              </button>
            </div>

            {/* Scholar Plan */}
            <div className="p-10 rounded-3xl bg-[#3B82F6] flex flex-col relative scale-105 shadow-2xl shadow-[#3B82F6]/20">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-[#3B82F6] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Most Popular
              </div>
              <h4 className="text-xl font-bold mb-2 text-white">Scholar</h4>
              <div className="text-4xl font-bold mb-8 text-white">
                £129<span className="text-sm text-white/70 font-normal">/year</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-white text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white text-lg">
                    check
                  </span>{" "}
                  Full Question Bank (3000+)
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white text-lg">
                    check
                  </span>{" "}
                  Detailed Video Solutions
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white text-lg">
                    check
                  </span>{" "}
                  Priority Scholar Support
                </li>
              </ul>
              <button
                type="button"
                className="w-full py-4 bg-white text-[#3B82F6] rounded-xl font-bold hover:bg-slate-100 transition-all"
              >
                Join as Scholar
              </button>
            </div>

            {/* Ultimate Plan */}
            <div className="p-10 rounded-3xl bg-[#0A0F1D] border border-white/10 flex flex-col">
              <h4 className="text-xl font-bold mb-2">Ultimate</h4>
              <div className="text-4xl font-bold mb-8">
                £249<span className="text-sm text-[#94A3B8] font-normal">/year</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-[#94A3B8] text-sm">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3B82F6] text-lg">
                    check
                  </span>{" "}
                  Everything in Scholar
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3B82F6] text-lg">
                    check
                  </span>{" "}
                  1-on-1 Mentoring Session
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3B82F6] text-lg">
                    check
                  </span>{" "}
                  Personalized Study Plan
                </li>
              </ul>
              <button
                type="button"
                className="w-full py-4 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition-all"
              >
                Choose Ultimate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[#0A0F1D]">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <h2 className="text-3xl font-display font-bold text-center mb-16">
            Common Questions
          </h2>
          <div className="space-y-4">
            {/* FAQ Item 1 */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2">
              <button
                type="button"
                onClick={() => toggleFaq(0)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-bold">
                  When is the best time to start preparing?
                </span>
                <span
                  className={`material-symbols-outlined transition-transform ${
                    expandedFaq === 0 ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {expandedFaq === 0 && (
                <div className="px-6 pb-6 text-[#94A3B8] leading-relaxed text-sm">
                  We recommend starting at least 4-6 months before the exam
                  date. This allows ample time to master the content and
                  significantly improve your mental arithmetic speed.
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2">
              <button
                type="button"
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-bold">
                  Are the practice questions reflective of the 2024 syllabus?
                </span>
                <span
                  className={`material-symbols-outlined transition-transform ${
                    expandedFaq === 1 ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {expandedFaq === 1 && (
                <div className="px-6 pb-6 text-[#94A3B8] leading-relaxed text-sm">
                  Yes, all our practice questions are created specifically for
                  the 2024 syllabus requirements by Cambridge tutors who are
                  familiar with the latest exam formats and content.
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2">
              <button
                type="button"
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-bold">
                  How often is the content updated?
                </span>
                <span
                  className={`material-symbols-outlined transition-transform ${
                    expandedFaq === 2 ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {expandedFaq === 2 && (
                <div className="px-6 pb-6 text-[#94A3B8] leading-relaxed text-sm">
                  Our content is regularly updated to reflect changes in the
                  exam syllabus and format. We typically update questions and
                  materials quarterly, with major updates before each exam
                  cycle.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-12 border-t border-white/5 bg-[#0A0F1D]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl tracking-tight uppercase">
                  CantabPrep
                </span>
              </div>
              <p className="text-[#94A3B8] max-w-sm leading-relaxed">
                The ultimate training ground for Cambridge Natural Sciences and
                Mathematics applicants. Developed by high-scoring scholars to
                help you bridge the gap.
              </p>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />{" "}
                  Cambridge Approved Credentials
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-widest">
                Platform
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                <li>
                  <Link
                    href="/skills/drill"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Mental Maths
                  </Link>
                </li>
                <li>
                  <Link
                    href="/questions/bank"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Question Bank
                  </Link>
                </li>
                <li>
                  <Link
                    href="/papers/library"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Past Papers
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Scholarships
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-widest">
                Support
              </h4>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#3B82F6] transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[#94A3B8] text-xs">
              © 2024 CantabPrep. Not affiliated with the University of
              Cambridge.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">public</span>
              </a>
              <a
                href="#"
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  alternate_email
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
