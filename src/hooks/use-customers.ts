"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FREE_CUSTOMER_LIMIT } from "@/lib/constants";

export function useCustomerCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", user.id);

      setCount(count ?? 0);
      setLoading(false);
    }

    load();
  }, []);

  const isAtLimit = count >= FREE_CUSTOMER_LIMIT;

  return { count, loading, isAtLimit, limit: FREE_CUSTOMER_LIMIT };
}
