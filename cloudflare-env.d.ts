declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
    HORIZON_USERNAME?: string;
    HORIZON_PASSWORD?: string;
    FINNHUB_API_KEY?: string;
    FINNHUB_API_URL?: string;
    MASSIVE_API_KEY?: string;
    MASSIVE_API_URL?: string;
  }
}
