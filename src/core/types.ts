export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

/** A context value. It is sent to the API in its string form. */
export type ContextValue = string | number | boolean;

/**
 * The evaluation context for a flag request. Every key is sent to the API as a
 * query parameter.
 *
 * - `cohort` is matched against the flag's cohort list.
 * - `env` selects an environment of a group flag.
 * - `targetingKey` is a stable identifier for the user (a user id, not an
 *   email where you can avoid it) that makes percentage rollouts sticky.
 * - Any other key is an audience attribute, such as `plan` or `country`.
 *
 * Values cannot be `undefined`. Leave the key out instead.
 */
export type UserContext = Record<string, ContextValue> & {
  cohort?: ContextValue;
  env?: string;
  targetingKey?: string | number;
};

export interface CacheOptions {
  ttlSeconds?: number;
  /**
   * The most responses the cache holds. When it is full the least recently
   * used entry is evicted. Defaults to 10,000.
   */
  maxEntries?: number;
}

export interface CallOptions {
  ttlSeconds?: number;
}

export interface RocketFlagClient {
  getFlag: (flagId: string, context?: UserContext, options?: CallOptions) => Promise<FlagStatus>;
}
