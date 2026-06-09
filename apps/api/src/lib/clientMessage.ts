import { config } from "../config.js";

/** Return a dev-oriented hint locally; a safe generic message in staging/prod. */
export function clientMessage(dev: string, prod: string): string {
  return config.isDev ? dev : prod;
}
