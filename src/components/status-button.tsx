"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/types";

interface StatusButtonProps {
  jobId: string;
  currentStatus: JobStatus;
  onUpdate: () => void;
}

const transitions: Partial<Record<JobStatus, { next: JobStatus; label: string }>> = {
  confirmed: { next: "on_my_way", label: "On My Way" },
  on_my_way: { next: "done", label: "Mark Done" },
};

export function StatusButton({ jobId, currentStatus, onUpdate }: StatusButtonProps) {
  const [loading, setLoading] = useState(false);
  const transition = transitions[currentStatus];

  if (!transition) return null;

  async function handleTap() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("jobs")
      .update({ status: transition!.next, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (!error) {
      // Trigger email notification via edge function
      try {
        await supabase.functions.invoke("send-status-email", {
          body: { job_id: jobId, new_status: transition!.next },
        });
      } catch {
        // Email failure shouldn't block the status update
      }
      onUpdate();
    }

    setLoading(false);
  }

  return (
    <Button
      onClick={handleTap}
      size="lg"
      className="w-full text-lg h-14"
      disabled={loading}
    >
      {loading ? "Updating..." : transition.label}
    </Button>
  );
}
