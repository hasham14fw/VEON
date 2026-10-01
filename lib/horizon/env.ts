// Universal environment adapter supporting Cloudflare Workers runtime, Node.js, and Vercel

export interface HorizonEnv {
  HORIZON_USERNAME?: string;
  HORIZON_PASSWORD?: string;
  FINNHUB_API_KEY?: string;
  FINNHUB_API_URL?: string;
  MASSIVE_API_KEY?: string;
  MASSIVE_API_URL?: string;
  AVIATIONSTACK_API_KEY?: string;
  AVIATIONSTACK_API_URL?: string;
  MARKET_FEED_URL?: string;
  MARKET_FEED_TOKEN?: string;
  DB?: D1Database;
  ASSETS?: Fetcher;
  [key: string]: any;
}

// Global container populated either by process.env (Node/Vercel) or Cloudflare Worker request handler
export const env: HorizonEnv = new Proxy({} as HorizonEnv, {
  get(_target, prop: string) {
    // 1. Process environment (Vercel / Node.js)
    if (typeof process !== 'undefined' && process.env && process.env[prop] !== undefined) {
      return process.env[prop];
    }
    // 2. Global Cloudflare context if attached
    if (typeof globalThis !== 'undefined') {
      const g = globalThis as any;
      if (g.env && g.env[prop] !== undefined) {
        return g.env[prop];
      }
      if (g[prop] !== undefined) {
        return g[prop];
      }
    }
    return undefined;
  },
});
