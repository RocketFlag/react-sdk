export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

export interface UserContext {
  cohort?: string | number | boolean;
  env?: string;
}

export interface CacheOptions {
  ttlSeconds?: number;
}

export type CallOptions = CacheOptions;

export interface RocketFlagClient {
  getFlag: (flagId: string, context?: UserContext, options?: CallOptions) => Promise<FlagStatus>;
}
