"use client";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LayerFilter } from "@/hooks/use-attack-stream";
import { AboutSheet } from "./about-sheet";

export function TopBar({
  layers,
  onLayers,
  paused,
  onPaused,
  spin,
  onSpin,
  source,
}: {
  layers: LayerFilter;
  onLayers: (v: LayerFilter) => void;
  paused: boolean;
  onPaused: (v: boolean) => void;
  spin: boolean;
  onSpin: (v: boolean) => void;
  source: React.ReactNode;
}) {
  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2">
          <span className="ping-soft absolute inset-0 rounded-full bg-l3" />
          <span className="relative size-2 rounded-full bg-l3" />
        </span>
        <span className="font-mono text-[13px] tracking-tight">
          ddos<span className="text-faint">/</span>live
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={layers}
          onValueChange={(v) => v && onLayers(v as LayerFilter)}
          aria-label="Attack layer"
          className="bg-background/80"
        >
          <ToggleGroupItem value="all" className="px-3 text-xs">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="L3" className="gap-1.5 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-l3" />
            L3/4
          </ToggleGroupItem>
          <ToggleGroupItem value="L7" className="gap-1.5 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-l7" />
            L7
          </ToggleGroupItem>
        </ToggleGroup>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPaused(!paused)}
              aria-label={paused ? "Resume stream" : "Pause stream"}
              className="bg-background/80"
            >
              {paused ? <Play /> : <Pause />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{paused ? "Resume stream" : "Pause stream"}</TooltipContent>
        </Tooltip>

        <label className="flex h-7 cursor-pointer items-center gap-2 rounded-lg border bg-background/80 px-2.5 text-xs">
          <Switch checked={spin} onCheckedChange={onSpin} size="sm" aria-label="Rotate globe" />
          Spin
        </label>

        {source}
        <AboutSheet />
      </div>
    </header>
  );
}
