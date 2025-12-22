/**
 * Infinite activity calendar with dark mode and inverted colors
 * No center dots, clean card design
 * Optimized with virtualization for performance
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CalendarIcon, TargetIcon, FireIcon, ChartIcon, TrophyIcon } from "@/components/icons";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";

const DAYS_PAST = 180;
const DAYS_FUTURE = 365;
const CARD_WIDTH = 64;
const BUFFER_SIZE = 10;

interface DayData {
  date: Date;
  questions: number;
  isToday: boolean;
  isFuture: boolean;
  examDate?: string;
}

export function ActivityHeatmap() {
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const momentumRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const generateCalendarData = async () => {
    const data: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a map to store metrics by date
    const metricsMap = new Map<string, number>();

    // Fetch real data from Supabase if user is logged in
    if (session?.user) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - DAYS_PAST);

      const { data: metrics, error } = await supabase
        .from("user_daily_metrics")
        .select("metric_date, total_questions")
        .eq("user_id", session.user.id)
        .gte("metric_date", startDate.toISOString().split("T")[0])
        .lte("metric_date", today.toISOString().split("T")[0]);

      if (!error && metrics) {
        metrics.forEach((metric: any) => {
          metricsMap.set(metric.metric_date, metric.total_questions);
        });
      }
    }

    // Generate past days with real data
    for (let i = DAYS_PAST; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const questions = metricsMap.get(dateStr) || 0;

      data.push({
        date,
        questions,
        isToday: false,
        isFuture: false,
      });
    }

    // Today
    const todayStr = today.toISOString().split("T")[0];
    const todayQuestions = metricsMap.get(todayStr) || 0;
    data.push({
      date: new Date(today),
      questions: todayQuestions,
      isToday: true,
      isFuture: false,
    });

    // Future dates for exam planning
    const examDates = [
      { daysAhead: 15, name: "ESAT" },
      { daysAhead: 45, name: "TMUA" },
      { daysAhead: 90, name: "Finals" },
    ];

    for (let i = 1; i <= DAYS_FUTURE; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const examMatch = examDates.find((e) => e.daysAhead === i);

      data.push({
        date,
        questions: 0,
        isToday: false,
        isFuture: true,
        examDate: examMatch?.name,
      });
    }

    return data;
  };

  const calculateStreak = (data: DayData[]) => {
    let streak = 0;
    const todayIndex = data.findIndex((d) => d.isToday);
    for (let i = todayIndex; i >= 0; i--) {
      if (data[i].questions > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await generateCalendarData();
      setCalendarData(data);
      setCurrentStreak(calculateStreak(data));
      setIsLoading(false);
    };
    
    loadData();
  }, [session?.user]);

  useEffect(() => {
    if (calendarData.length === 0 || !scrollRef.current) return;

    const todayIndex = calendarData.findIndex((d) => d.isToday);
    if (todayIndex >= 0) {
      const scrollPosition = todayIndex * CARD_WIDTH - window.innerWidth / 2 + 28;

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: scrollPosition,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [calendarData]);

  const updateVisibleRange = useCallback(() => {
    if (!scrollRef.current) return;

    const scrollLeft = scrollRef.current.scrollLeft;
    const containerWidth = scrollRef.current.clientWidth;

    const startIndex = Math.max(0, Math.floor(scrollLeft / CARD_WIDTH) - BUFFER_SIZE);
    const endIndex = Math.min(
      calendarData.length,
      Math.ceil((scrollLeft + containerWidth) / CARD_WIDTH) + BUFFER_SIZE,
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [calendarData.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateVisibleRange();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    updateVisibleRange();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [updateVisibleRange]);

  const applyMomentum = useCallback(function momentum() {
    if (!scrollRef.current) return;
    if (Math.abs(momentumRef.current) > 0.1) {
      scrollRef.current.scrollLeft += momentumRef.current;
      momentumRef.current *= 0.92;
      animationRef.current = requestAnimationFrame(momentum);
    } else {
      momentumRef.current = 0;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!scrollRef.current) return;

      const delta = e.deltaY;
      const sensitivity = 0.4;

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      momentumRef.current = delta * sensitivity;
      applyMomentum();
    },
    [applyMomentum],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const wheelHandler = (e: Event) => {
      handleWheel(e as WheelEvent);
    };

    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheelHandler);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [handleWheel]);

  const handleMouseEnter = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const getColorScheme = (day: DayData) => {
    if (day.examDate) return "bg-[#B8D4B5] border-2 border-[#B8D4B5]";
    if (day.isToday) return "bg-[#B8D4B5] border-2 border-[#B8D4B5]";
    if (day.isFuture) return "bg-[#243224]/65 border border-[#243224]/65";

    if (day.questions === 0) return "bg-[#85BC82]/20 border border-[#85BC82]/20";
    if (day.questions < 10) return "bg-[#85BC82]/30 border border-[#85BC82]/30";
    if (day.questions < 20) return "bg-[#85BC82]/40 border border-[#85BC82]/40";
    if (day.questions < 35) return "bg-[#85BC82]/50 border border-[#85BC82]/50";
    return "bg-[#85BC82]/60 border border-[#85BC82]/60";
  };

  const getTextColor = (day: DayData) => {
    if (day.examDate) return "text-black/90";
    if (day.isToday) return "text-black/90";
    if (!day.isFuture && day.questions >= 30) return "text-black/80";
    return "text-white/95";
  };

  const getMonthLabel = (date: Date) => {
    if (date.getDate() === 1) {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    return null;
  };

  if (calendarData.length === 0) {
    return (
      <div className="w-full text-center py-16">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="text-sm text-white/60">Loading calendar...</span>
        </div>
      </div>
    );
  }

  const totalQuestions = calendarData
    .filter((d) => !d.isFuture)
    .reduce((sum, day) => sum + day.questions, 0);
  const daysActive = calendarData.filter((day) => !day.isFuture && day.questions > 0).length;
  const avgPerDay = daysActive > 0 ? Math.round(totalQuestions / daysActive) : 0;

  const nearestExam = calendarData.find((d) => d.examDate);
  const daysUntilExam = nearestExam
    ? Math.ceil((nearestExam.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const examType = nearestExam?.examDate || "ESAT";

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-12 flex-wrap w-full">
        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 scale-95 opacity-80 hover:opacity-100 hover:scale-[1.25] transition-all duration-300 relative group z-10">
          <div className="text-center leading-tight">
            <div className="text-xs font-semibold text-white/95">{avgPerDay}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide">Avg/Day</div>
          </div>
        </div>

        <div className="inline-flex items-center justify-center px-8 py-2.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] hover:scale-[1.25] transition-all duration-300 relative group z-20">
          <div className="text-center leading-tight">
            <div className="text-base font-bold text-white/95">{totalQuestions}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide">Total</div>
          </div>
        </div>

        <div className="inline-flex items-center justify-center px-6 py-3 rounded-3xl bg-primary/10 border border-primary/30 backdrop-blur-sm hover:bg-primary/15 hover:scale-[1.25] transition-all duration-300 relative group z-30">
          <div className="text-center leading-tight">
            <div className="text-xl font-extrabold text-white">{daysUntilExam} Days</div>
            <div className="text-[9px] text-primary/70 uppercase tracking-wide">
              Until {examType}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center justify-center px-8 py-2.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] hover:scale-[1.25] transition-all duration-300 relative group z-20">
          <div className="text-center leading-tight">
            <div className="text-base font-bold text-white/95">{currentStreak}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide">Streak</div>
          </div>
        </div>

        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 scale-95 opacity-80 hover:opacity-100 hover:scale-[1.25] transition-all duration-300 relative group z-10">
          <div className="text-center leading-tight">
            <div className="text-xs font-semibold text-white/95">{accuracy}%</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide">Accuracy</div>
          </div>
        </div>
      </div>

      <div className="relative overflow-visible">
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10" />

        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-visible pb-6 pt-6 [overscroll-behavior:contain] cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="relative px-24"
            style={{
              width: `${calendarData.length * CARD_WIDTH + 192}px`,
              height: "100px",
            }}
          >
            <div className="inline-flex gap-2 absolute left-24 top-0">
              {calendarData.slice(visibleRange.start, visibleRange.end).map((day, arrayIndex) => {
                const index = visibleRange.start + arrayIndex;
                const monthLabel = getMonthLabel(day.date);

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1 flex-shrink-0 relative group-hover:z-[2147483647]"
                    style={{
                      transform: `translateX(${index * CARD_WIDTH}px)`,
                      position: "absolute",
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    {monthLabel && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/50 whitespace-nowrap z-20">
                        {monthLabel}
                      </div>
                    )}

                    <span
                      className={`text-[10px] font-medium ${
                        day.isToday ? "text-primary font-bold" : "text-white/50"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>

                    <div className="relative group">
                      <div
                        className={`
                        calendar-card w-14 h-14 rounded-xl transition-all duration-300
                        cursor-pointer
                        ${getColorScheme(day)}
                        flex items-center justify-center
                        group-hover:shadow-2xl
                      `}
                        style={{
                          isolation: "isolate",
                          position: "relative",
                          zIndex: 1,
                          transformOrigin: "center",
                        }}
                      >
                        {(day.isToday || day.examDate) && (
                          <div
                            className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none opacity-100 ${
                              day.isToday || day.examDate ? "group-hover:scale-[2.55]" : ""
                            }`}
                            style={{
                              background: "rgba(133, 188, 130, 0.05)",
                              transform: day.examDate ? "scale(2.5)" : "scale(1.75)",
                              transformOrigin: "center",
                              zIndex: -9999,
                            }}
                          />
                        )}

                        {day.examDate && (
                          <div className="absolute inset-0 group-hover:opacity-0 transition-opacity flex items-center justify-center">
                            <span className="text-xs font-medium text-black tracking-wide">
                              {day.examDate}
                            </span>
                          </div>
                        )}

                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-1 gap-0.5 ${getTextColor(
                            day,
                          )}`}
                        >
                          {day.examDate ? (
                            <>
                              <div className="text-[11px] font-medium text-black/80 uppercase tracking-wide">
                                {day.examDate}
                              </div>
                              <div className="text-[9px] text-black/60">Exam Day</div>
                            </>
                          ) : day.isFuture ? (
                            <div
                              className="text-[11px] text-white/50 font-medium"
                              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                            >
                              Future
                            </div>
                          ) : day.questions > 0 ? (
                            <>
                              <div
                                className="text-[11px] font-bold text-white"
                                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                              >
                                {day.questions}
                              </div>
                              <div
                                className="text-[9px] text-white/60 uppercase tracking-wide"
                                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                              >
                                Questions
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                className="text-[11px] font-bold text-white"
                                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                              >
                                0
                              </div>
                              <div
                                className="text-[9px] text-white/60 uppercase tracking-wide"
                                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                              >
                                Questions
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-white/40">
        <span className="text-white/50 font-medium">Less</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#85BC82]/20 border border-[#85BC82]/20" />
          <div className="w-3 h-3 rounded bg-[#85BC82]/30 border border-[#85BC82]/30" />
          <div className="w-3 h-3 rounded bg-[#85BC82]/40 border border-[#85BC82]/40" />
          <div className="w-3 h-3 rounded bg-[#85BC82]/50 border border-[#85BC82]/50" />
          <div className="w-3 h-3 rounded bg-[#85BC82]/60 border border-[#85BC82]/60" />
        </div>
        <span className="text-white/50 font-medium">More</span>
      </div>
    </div>
  );
}
