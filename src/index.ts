// React layer
export { RocketFlagProvider } from "./RocketFlagProvider";
export type { RocketFlagProviderProps } from "./RocketFlagProvider";
export { useFlag } from "./useFlag";
export type { UseFlagResult } from "./useFlag";
export { Flag } from "./Flag";
export type { FlagProps } from "./Flag";

// Core escape hatch for advanced / imperative use
export { createRocketflagClient } from "./core/client";

// Errors
export { APIError, NetworkError, InvalidResponseError } from "./core/errors";

// Types
export type { FlagStatus, UserContext, CacheOptions, CallOptions, RocketFlagClient } from "./core/types";
