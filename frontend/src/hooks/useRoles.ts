import { useEffect, useState } from "react";
import { miscApi } from "@/api";
import type { Role } from "@/api/types";

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await miscApi.roles();
        if (active) setRoles(data);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { roles, loading, error };
}