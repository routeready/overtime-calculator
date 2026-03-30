// Supabase Edge Function: send-status-email
// Sends an email notification to the customer when a job status changes.
//
// Invoke with: supabase.functions.invoke("send-status-email", { body: { job_id, new_status } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  job_id: string;
  new_status: string;
}

function getSubject(providerName: string, status: string): string {
  switch (status) {
    case "confirmed":
      return `${providerName} confirmed your service request`;
    case "on_my_way":
      return `${providerName} is on the way!`;
    case "done":
      return `${providerName} has finished the job`;
    default:
      return `Update from ${providerName}`;
  }
}

function getBody(providerName: string, status: string, serviceType: string): string {
  const service = serviceType === "lawn" ? "lawn mowing" : "snow removal";
  switch (status) {
    case "confirmed":
      return `Great news! ${providerName} has confirmed your ${service} request. They'll let you know when they're on the way.`;
    case "on_my_way":
      return `${providerName} is headed to your place now for ${service}. See you soon!`;
    case "done":
      return `${providerName} has finished your ${service}. Everything is taken care of!`;
    default:
      return `${providerName} sent you an update about your ${service} request.`;
  }
}

Deno.serve(async (req: Request) => {
  const { job_id, new_status } = (await req.json()) as RequestBody;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch job with customer and profile info
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, customer:customers(*), profile:profiles(*)")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
    });
  }

  const customerEmail = job.customer?.email;
  const providerName = job.profile?.display_name ?? "Your provider";

  if (!customerEmail) {
    return new Response(JSON.stringify({ error: "No customer email" }), {
      status: 400,
    });
  }

  // Send email via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "YardBoss <notifications@yardboss.app>",
      to: [customerEmail],
      subject: getSubject(providerName, new_status),
      text: getBody(providerName, new_status, job.service_type),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return new Response(JSON.stringify({ error: errorText }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
