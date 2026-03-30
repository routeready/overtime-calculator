"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { FlyerPreview } from "@/components/flyer-preview";
import { Button } from "@/components/ui/button";

export default function FlyerPage() {
  const { profile, loading } = useProfile();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/dashboard/setup");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile) {
      setShareUrl(`${window.location.origin}/s/${profile.slug}`);
    }
  }, [profile]);

  if (loading || !profile) {
    return <p className="text-center text-muted-foreground py-8">Loading...</p>;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `${profile!.display_name} — Lawn & Snow Service`,
        text: "Book lawn mowing or snow removal from your neighborhood teen!",
        url: shareUrl,
      });
    } else {
      handleCopy();
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-xl font-bold">Your Flyer</h2>
      <p className="text-sm text-muted-foreground">
        Share this with your neighbors to get service requests.
      </p>

      <FlyerPreview profile={profile} shareUrl={shareUrl} />

      <div className="flex gap-3">
        <Button onClick={handleShare} className="flex-1" size="lg">
          Share
        </Button>
        <Button onClick={handleCopy} variant="outline" className="flex-1" size="lg">
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>
    </div>
  );
}
