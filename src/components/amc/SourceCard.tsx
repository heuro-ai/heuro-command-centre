import { ExternalLink } from "lucide-react";
import type { Source } from "@/mock/types";
import { ConfidenceBar } from "./primitives";

export function SourceCard({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-md border border-border bg-surface p-3 transition-colors hover:border-accent-cyan/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-foreground">{source.title}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {source.domain}
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2">
        <ConfidenceBar value={source.confidence} />
      </div>
    </a>
  );
}