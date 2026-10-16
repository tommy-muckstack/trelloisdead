const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/trelloisdead";
export default {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // /f/<id> style public routes live under the same basePath.
  poweredByHeader: false,
  outputFileTracingRoot: new URL(".", import.meta.url).pathname, // a lockfile further up the tree confuses root detection; keep tracing to this repo
};
