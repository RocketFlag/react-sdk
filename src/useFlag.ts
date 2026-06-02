import { useCallback, useContext, useEffect, useState } from "react";
import { RocketFlagContext } from "./context";
import type { CallOptions, FlagStatus, UserContext } from "./core/types";

export interface UseFlagResult {
  /** The resolved flag, or `null` while loading / on error. */
  flag: FlagStatus | null;
  /** Convenience: `flag?.enabled ?? false`. */
  enabled: boolean;
  /** `true` until the first fetch settles. */
  loading: boolean;
  /** The error thrown by the fetch, if any. */
  error: Error | null;
  /** Re-run the fetch on demand. */
  refetch: () => void;
}

export function useFlag(flagId: string, context?: UserContext, options?: CallOptions): UseFlagResult {
  const client = useContext(RocketFlagContext);
  if (!client) {
    throw new Error("useFlag must be used within a <RocketFlagProvider>");
  }

  const [flag, setFlag] = useState<FlagStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  // Serialise object props so stable-by-value contexts/options don't retrigger
  // the effect on every render.
  const contextKey = JSON.stringify(context ?? null);
  const optionsKey = JSON.stringify(options ?? null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    client
      .getFlag(flagId, context, options)
      .then((result) => {
        if (!active) return;
        setFlag(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFlag(null);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // context/options are tracked via their serialised keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, flagId, contextKey, optionsKey, reloadCount]);

  return { flag, enabled: flag?.enabled ?? false, loading, error, refetch };
}
