"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusButton } from "@/components/status-button";
import type { Job } from "@/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJob = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select("*, customer:customers(*)")
      .eq("id", id)
      .single();

    setJob(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  async function handleConfirm() {
    const supabase = createClient();
    await supabase
      .from("jobs")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", id);
    loadJob();
  }

  async function handleCancel() {
    const supabase = createClient();
    await supabase
      .from("jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    loadJob();
  }

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  }

  if (!job) {
    return <p className="text-center text-muted-foreground py-8">Job not found.</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back
      </button>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{job.customer?.name}</h2>
          <Badge variant="outline" className="capitalize">
            {job.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium capitalize">
              {job.service_type === "lawn" ? "Lawn Mowing" : "Snow Removal"}
            </span>
          </div>
          {job.customer?.address && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right max-w-[60%]">
                {job.customer.address}
              </span>
            </div>
          )}
          {job.customer?.email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{job.customer.email}</span>
            </div>
          )}
          {job.requested_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested Date</span>
              <span className="font-medium">
                {new Date(job.requested_date).toLocaleDateString()}
              </span>
            </div>
          )}
          {job.notes && (
            <div>
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{job.notes}</p>
            </div>
          )}
        </div>

        {job.status === "pending" && (
          <div className="flex gap-3">
            <Button onClick={handleConfirm} className="flex-1" size="lg">
              Confirm Job
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Decline
            </Button>
          </div>
        )}

        {(job.status === "confirmed" || job.status === "on_my_way") && (
          <StatusButton
            jobId={job.id}
            currentStatus={job.status}
            onUpdate={loadJob}
          />
        )}

        {job.status === "done" && (
          <div className="text-center py-4">
            <div className="text-3xl">&#9989;</div>
            <p className="text-sm text-muted-foreground mt-1">
              This job is complete.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
