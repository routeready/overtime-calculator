"use client";

import type { Profile } from "@/types";
import { APP_NAME } from "@/lib/constants";

interface FlyerPreviewProps {
  profile: Profile;
  shareUrl: string;
}

export function FlyerPreview({ profile, shareUrl }: FlyerPreviewProps) {
  return (
    <div className="rounded-2xl border-2 border-primary bg-accent p-6 text-center space-y-4">
      <div className="text-4xl">&#127793;</div>
      <h2 className="text-2xl font-bold text-primary">{profile.display_name}</h2>
      <p className="text-sm text-foreground">
        Lawn mowing &amp; snow removal for your neighborhood.
      </p>
      <div className="rounded-lg bg-background p-3 text-sm">
        <p className="font-medium">Book a service:</p>
        <p className="text-primary break-all">{shareUrl}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Powered by {APP_NAME}
      </p>
    </div>
  );
}
