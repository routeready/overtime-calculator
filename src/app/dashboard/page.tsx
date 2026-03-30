"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { useJobs } from "@/hooks/use-jobs";
import { JobCard } from "@/components/job-card";
import type { JobStatus } from "@/types";

const statusOrder: JobStatus[] = ["on_my_way", "confirmed", "pending", "done", "cancelled"];

export default function DashboardPage() {
  const { profile, loading: profileLoading } = useProfile();
  const { jobs, loading: jobsLoading } = useJobs();
  const router = useRouter();

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.push("/dashboard/setup");
    }
  }, [profileLoading, profile, router]);

  if (profileLoading || jobsLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  }

  if (!profile) return null;

  const sortedJobs = [...jobs].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  const activeJobs = sortedJobs.filter((j) => j.status !== "done" && j.status !== "cancelled");
  const pastJobs = sortedJobs.filter((j) => j.status === "done" || j.status === "cancelled");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">
        Hey, {profile.display_name.split(" ")[0]}
      </h2>

      {activeJobs.length === 0 && pastJobs.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">&#127793;</div>
          <p className="text-muted-foreground">No jobs yet.</p>
          <p className="text-sm text-muted-foreground">
            Share your flyer to start getting requests!
          </p>
        </div>
      ) : (
        <>
          {activeJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active ({activeJobs.length})
              </h3>
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {pastJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Completed ({pastJobs.length})
              </h3>
              {pastJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
