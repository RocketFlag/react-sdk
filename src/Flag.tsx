import type { ReactNode } from "react";
import { useFlag } from "./useFlag";
import type { CallOptions, UserContext } from "./core/types";

export interface FlagProps {
  /** The flag ID to evaluate. */
  id: string;
  context?: UserContext;
  options?: CallOptions;
  /** Rendered when the flag is enabled. */
  children: ReactNode;
  /** Rendered when the flag is disabled or the fetch errors. Defaults to nothing. */
  fallback?: ReactNode;
  /** Rendered while the flag is loading. Defaults to nothing. */
  loading?: ReactNode;
}

export const Flag = ({ id, context, options, children, fallback = null, loading = null }: FlagProps) => {
  const { enabled, loading: isLoading } = useFlag(id, context, options);

  if (isLoading) return <>{loading}</>;
  return <>{enabled ? children : fallback}</>;
};
