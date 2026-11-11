"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Country flag from flagcdn (SVG). Falls back to the ISO code if it fails to load. */
export function Flag({ code, className }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !/^[A-Za-z]{2}$/.test(code)) {
    return (
      <span
        className={cn(
          "inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-muted font-mono text-[8px] text-muted-foreground",
          className,
        )}
      >
        {code}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("h-3.5 w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-white/10", className)}
    />
  );
}
