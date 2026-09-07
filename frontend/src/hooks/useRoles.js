import { useEffect, useState } from "react";
import { miscApi } from "@/api";

/**
 * Fetches and caches the list of available roles.
 * Used by the registration form to populate the role selector.
 */
export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await miscApi.roles();
        if (active) setRoles(data.data ?? data);
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
