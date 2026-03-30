// Email templates for status notifications
// Used by the Supabase Edge Function (send-status-email)

export function getStatusEmailSubject(
  providerName: string,
  status: string
): string {
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

export function getStatusEmailBody(
  providerName: string,
  status: string,
  serviceType: string
): string {
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
