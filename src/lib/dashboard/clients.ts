import type { ClientConfig } from './types';

// Pre-configured clients are loaded from the CLIENT_REGISTRY env var (JSON array).
// If no env var is set, this map is empty — users bring their own data via upload or sheet URL.
export const CLIENT_CONFIGS: Record<string, ClientConfig> = {};

// Shimano is loaded conditionally — only if the server has credentials configured.
// This avoids hardcoding a client's sheet ID in public source code.
// To add Shimano (or any client) to a deployment, set CLIENT_REGISTRY in your Vercel env:
//   [{"id":"shimano","name":"Shimano Fishing","sheetId":"<ID>","accentColor":"#1D9E75",...}]

export function getClient(id: string): ClientConfig {
  const cfg = CLIENT_CONFIGS[id];
  if (!cfg) throw new Error(`Unknown client: ${id}`);
  return cfg;
}

export const DEFAULT_CLIENT: string | null = null;
