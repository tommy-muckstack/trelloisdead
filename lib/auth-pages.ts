import { BP } from "@/lib/basepath";
/** Where to go after signing in: a same-site path from ?callbackUrl, else the app. */
export function afterAuth(callbackUrl?: string) {
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  return BP + (rel && /^\/(?!\/)/.test(rel) && !/^\/(login|signup|forgot-password)\b/.test(rel) ? rel : "/app");
}
