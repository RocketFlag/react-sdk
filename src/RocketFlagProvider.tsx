import { useMemo, type ReactNode } from "react";
import { RocketFlagContext } from "./context";
import { createRocketflagClient } from "./core/client";
import type { RocketFlagClient } from "./core/types";

export interface RocketFlagProviderProps {
  children: ReactNode;
  /** API version segment, e.g. "v1". Defaults to the client's built-in default. */
  version?: string;
  /** Base API URL. Defaults to the client's built-in default. */
  apiUrl?: string;
  /**
   * Default cache TTL (in seconds) shared across every `useFlag` call under this
   * provider. Omit or set to 0 to disable caching.
   */
  cacheTtlSeconds?: number;
  /**
   * The most responses the shared cache holds before it evicts the least
   * recently used one. Defaults to 10,000.
   */
  cacheMaxEntries?: number;
  /**
   * Provide a pre-built client instead of constructing one from the props above.
   * Useful for testing or advanced/custom setups. When set, `version`, `apiUrl`,
   * `cacheTtlSeconds` and `cacheMaxEntries` are ignored.
   */
  client?: RocketFlagClient;
}

export const RocketFlagProvider = ({
  children,
  version,
  apiUrl,
  cacheTtlSeconds,
  cacheMaxEntries,
  client,
}: RocketFlagProviderProps) => {
  const value = useMemo<RocketFlagClient>(() => {
    if (client) return client;
    return createRocketflagClient(version, apiUrl, { ttlSeconds: cacheTtlSeconds, maxEntries: cacheMaxEntries });
  }, [client, version, apiUrl, cacheTtlSeconds, cacheMaxEntries]);

  return <RocketFlagContext.Provider value={value}>{children}</RocketFlagContext.Provider>;
};
