"use client";
import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Counter } from "@/hooks/use-attack-stream";
import { Flag } from "./flag";

const nf = new Intl.NumberFormat("en-US");

function Rows({ rows, tone }: { rows: Counter[]; tone: "target" | "source" }) {
  if (rows.length === 0) return <p className="py-6 text-xs text-muted-foreground">Waiting for the first attacks…</p>;
  const max = rows[0].count || 1;
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  return (
    <ul className="space-y-0.5">
      {rows.map((r, i) => (
        <motion.li
          key={r.key}
          layout
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="group relative grid grid-cols-[1.25rem_auto_1fr_auto] items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm"
        >
          <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
          <Flag code={r.key} />
          <span className="truncate">{r.name}</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {nf.format(r.count)}
            <span className="ml-2 inline-block w-8 text-right text-faint">{Math.round((r.count / total) * 100)}%</span>
          </span>
          <motion.span
            className={`absolute bottom-0 left-1.5 h-px ${tone === "target" ? "bg-l3/60" : "bg-foreground/30"}`}
            animate={{ width: `calc(${(r.count / max) * 100}% - 0.75rem)` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </motion.li>
      ))}
    </ul>
  );
}

export function CountryTabs({ targets, sources }: { targets: Counter[]; sources: Counter[] }) {
  return (
    <Tabs defaultValue="targets" className="gap-3">
      <TabsList variant="line" className="h-8 p-0">
        <TabsTrigger value="targets" className="px-0 pr-4 text-[13px]">
          Most targeted
        </TabsTrigger>
        <TabsTrigger value="sources" className="px-0 pr-4 text-[13px]">
          Top sources
        </TabsTrigger>
      </TabsList>
      <TabsContent value="targets">
        <Rows rows={targets} tone="target" />
      </TabsContent>
      <TabsContent value="sources">
        <Rows rows={sources} tone="source" />
      </TabsContent>
    </Tabs>
  );
}
