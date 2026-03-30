"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREE_CUSTOMER_LIMIT } from "@/lib/constants";
import type { ServiceType } from "@/types";

interface RequestFormProps {
  profileId: string;
  slug: string;
}

export function RequestForm({ profileId }: RequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("lawn");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Check customer limit
    const { count } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);

    if ((count ?? 0) >= FREE_CUSTOMER_LIMIT) {
      // Check if this person is already a customer (by email)
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", profileId)
        .eq("email", email)
        .single();

      if (!existing) {
        setError(
          "This provider has reached their customer limit. Please ask them to upgrade."
        );
        setLoading(false);
        return;
      }
    }

    // Upsert customer
    let customerId: string;

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", profileId)
      .eq("email", email)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from("customers")
        .update({ name, address })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({ profile_id: profileId, name, email, address })
        .select("id")
        .single();

      if (custError || !newCustomer) {
        setError(custError?.message ?? "Failed to create request.");
        setLoading(false);
        return;
      }
      customerId = newCustomer.id;
    }

    // Create job
    const { error: jobError } = await supabase.from("jobs").insert({
      profile_id: profileId,
      customer_id: customerId,
      service_type: serviceType,
      requested_date: date || null,
      notes: notes || null,
    });

    if (jobError) {
      setError(jobError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-4xl">&#9989;</div>
        <h2 className="text-xl font-bold">Request Sent!</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll get an email when they confirm and when they&apos;re on the way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Your Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Your Address
        </label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Maple St"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Service</label>
        <div className="flex gap-3">
          {(["lawn", "snow"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setServiceType(type)}
              className={`flex-1 rounded-[var(--radius)] border p-3 text-center text-sm font-medium transition-colors ${
                serviceType === type
                  ? "border-primary bg-accent text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {type === "lawn" ? "🌿 Lawn Mowing" : "❄️ Snow Removal"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium mb-1">
          Preferred Date (optional)
        </label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. backyard only, driveway + sidewalk"
          className="flex min-h-[80px] w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Sending..." : "Request Service"}
      </Button>
    </form>
  );
}
