export async function tenantFetch(tenantSlug: string, url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-tenant-slug', tenantSlug);
  
  return fetch(url, {
    ...options,
    headers
  });
}
