declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
  }
}
declare namespace Cloudflare { interface Env {HORIZON_USERNAME?:string;HORIZON_PASSWORD?:string;} }
