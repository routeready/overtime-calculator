import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-primary">
          {APP_NAME}
        </h1>
        <p className="text-lg text-muted-foreground">{APP_DESCRIPTION}</p>

        <div className="space-y-3">
          <p className="text-sm font-medium">
            Start your neighborhood lawn &amp; snow business in 2 minutes.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Drop a pin on your street</li>
            <li>Share a flyer link with neighbors</li>
            <li>Manage jobs from your phone</li>
            <li>Free for your first 5 customers</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/login">
            <Button size="lg" className="w-full">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
