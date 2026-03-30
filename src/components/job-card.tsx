"use client";

import Link from "next/link";
import type { Job } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "secondary" },
  on_my_way: { label: "On My Way", variant: "default" },
  done: { label: "Done", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function JobCard({ job }: { job: Job }) {
  const config = statusConfig[job.status] ?? statusConfig.pending;

  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <div
        className={cn(
          "rounded-[var(--radius)] border border-border p-4 space-y-2 transition-colors hover:bg-muted/50 active:bg-muted",
          job.status === "done" && "opacity-60"
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{job.customer?.name ?? "Customer"}</h3>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="capitalize">{job.service_type === "lawn" ? "Lawn Mowing" : "Snow Removal"}</span>
          {job.requested_date && (
            <span>
              {new Date(job.requested_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {job.customer?.address && (
          <p className="text-xs text-muted-foreground truncate">
            {job.customer.address}
          </p>
        )}
      </div>
    </Link>
  );
}
