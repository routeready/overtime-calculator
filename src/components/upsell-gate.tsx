"use client";

import { Button } from "@/components/ui/button";
import { FREE_CUSTOMER_LIMIT } from "@/lib/constants";

interface UpsellGateProps {
  onClose: () => void;
}

export function UpsellGate({ onClose }: UpsellGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 space-y-4 shadow-xl">
        <div className="text-center space-y-2">
          <div className="text-4xl">&#127775;</div>
          <h3 className="text-xl font-bold">You&apos;re growing!</h3>
          <p className="text-sm text-muted-foreground">
            You&apos;ve reached {FREE_CUSTOMER_LIMIT} customers on the free plan.
            Upgrade to keep adding more.
          </p>
        </div>

        <div className="rounded-lg border border-primary bg-accent p-4 text-center">
          <p className="text-2xl font-bold text-primary">$4.99/mo</p>
          <p className="text-sm text-muted-foreground">Unlimited customers</p>
        </div>

        <div className="space-y-2">
          <Button className="w-full" size="lg">
            Upgrade Now
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
