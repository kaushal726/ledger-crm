export interface Route {
  path: string[];
  query: URLSearchParams;
}

/** "/<base>/customers/abc?tab=items" -> { path: ["customers", "abc"], query: tab=items } */
export function parseLocation(pathname: string, search: string, base: string): Route {
  const underBase = pathname.startsWith(base) || pathname + "/" === base;
  const relative = underBase ? pathname.slice(base.length) : pathname.replace(/^\//, "");
  return {
    path: relative.split("/").filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(search),
  };
}
