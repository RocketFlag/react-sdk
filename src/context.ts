import { createContext } from "react";
import type { RocketFlagClient } from "./core/types";

export const RocketFlagContext = createContext<RocketFlagClient | null>(null);
