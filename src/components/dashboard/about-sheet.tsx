"use client";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STEPS = [
  {
    title: "Pull the aggregates",
    body: "Every 5 minutes the server asks Cloudflare Radar for the last 24 hours of DDoS data: top origin→target country pairs, attack vectors, bitrates, HTTP methods and the attack-volume curve.",
  },
  {
    title: "Rebuild individual attacks",
    body: "Your browser draws attacks one by one from those distributions. Pairs, vectors and sizes appear in proportion to Cloudflare's shares, so a few minutes of the stream matches the real breakdown.",
  },
  {
    title: "Replay the day",
    body: "The arrival rate follows the 24-hour volume curve, replayed at 60× speed (15 seconds per 15-minute bucket).",
  },
];

export function AboutSheet() {
  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="About the data">
              <Info />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>How this works</TooltipContent>
      </Tooltip>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-xl font-medium tracking-tight">How the live map works</SheetTitle>
          <SheetDescription>
            Cloudflare publishes aggregated attack data rather than a raw event stream. This map turns those aggregates back
            into a stream of individual attacks.
          </SheetDescription>
        </SheetHeader>
        <ol className="space-y-5 px-4 py-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[auto_1fr] gap-x-3">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mx-4 space-y-3 rounded-xl border p-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="mr-1.5 inline-block size-2 rounded-full bg-l3" />
            <span className="text-foreground">Network (L3/4)</span> attacks such as SYN, UDP and DNS floods. Because source IPs
            are spoofed, Cloudflare reports the data center that received the traffic as the origin.
          </p>
          <p>
            <span className="mr-1.5 inline-block size-2 rounded-full bg-l7" />
            <span className="text-foreground">Application (L7)</span> HTTP floods, labelled with the method and the product that
            mitigated them.
          </p>
        </div>
        <p className="mt-auto px-4 py-4 text-[11px] text-muted-foreground">
          Data:{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href="https://radar.cloudflare.com" target="_blank" rel="noreferrer">
            Cloudflare Radar
          </a>
          , CC BY-NC 4.0.
        </p>
      </SheetContent>
    </Sheet>
  );
}
