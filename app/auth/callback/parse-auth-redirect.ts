/**
 * Same idea as `@supabase/auth-js` `parseParametersFromURL` — query wins over hash.
 */
export function parseAuthRedirectParams(href: string): Record<string, string> {
  const result: Record<string, string> = {};
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return result;
  }
  if (url.hash?.startsWith("#")) {
    try {
      const hashParams = new URLSearchParams(url.hash.slice(1));
      hashParams.forEach((value, key) => {
        result[key] = value;
      });
    } catch {
      /* ignore */
    }
  }
  url.searchParams.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
