const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/trelloisdead";
export default {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // /f/<id> style public routes live under the same basePath.
  poweredByHeader: false,
  // PostHog reverse proxy (<basePath>/ingest → PostHog); keep /ingest/e/ trailing slashes intact.
  skipTrailingSlashRedirect: true,
  async rewrites() { return [{ source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" }, { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" }]; },
  outputFileTracingRoot: new URL(".", import.meta.url).pathname, // a lockfile further up the tree confuses root detection; keep tracing to this repo
};
