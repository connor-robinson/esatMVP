/**
 * Preset manager component for saved sessions
 */

"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SessionPreset } from "@/types/core";
import { Clock, Trash2 } from "lucide-react";
import { getTopic } from "@/config/topics";

interface PresetManagerProps {
  presets: SessionPreset[];
  onLoad: (preset: SessionPreset) => void;
  onDelete: (presetId: string) => void;
}

export function PresetManager({ presets, onLoad, onDelete }: PresetManagerProps) {
  if (presets.length === 0) {
    return null;
  }

  return (
    <Card variant="flat" className="p-5">
      <div className="mb-4">
        <h3 className="text-xl font-mono font-semibold uppercase tracking-wider text-white/70">
          Saved Presets
        </h3>
        <p className="text-sm font-mono text-white/50 mt-1">
          Load your saved session configurations.
        </p>
      </div>
      
      <div className="space-y-3">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="p-4 rounded-organic-md bg-white/5 hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white/90 truncate mb-1.5">
                  {preset.name}
                </div>
                <div className="text-xs text-white/50 line-clamp-2 mb-2">
                  {preset.topicIds
                    .map((id) => getTopic(id)?.name || id)
                    .join(", ")}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Clock size={12} />
                  <span>{preset.durationMin} min</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onLoad(preset)}
                >
                  Load
                </Button>
                <button
                  onClick={() => onDelete(preset.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                  aria-label="Delete preset"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}



