import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RequestForm } from "./request-form";
import { APP_NAME } from "@/lib/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicRequestPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!profile) {
    notFound();
  }

  return (
    <div className="flex min-h-full items-start justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">&#127793;</div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            Request lawn mowing or snow removal service.
          </p>
        </div>

        <RequestForm profileId={profile.id} slug={slug} />

        <p className="text-center text-xs text-muted-foreground">
          Powered by {APP_NAME}
        </p>
      </div>
    </div>
  );
}
