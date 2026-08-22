import { cn } from "@/lib/utils";

const YOUTUBE_VIDEO_ID = "-ICjtbcTghA";

export function HeroPaperStack({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#161D2F] shadow-lg shadow-black/30">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}`}
          title="Which ESAT past papers should you use?"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
