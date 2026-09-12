import { createBrowserClient } from '@supabase/ssr'

/** Headers that GafCore CORS currently rejects in preflight. */
const BLOCKED_HEADERS = [
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
]

function sanitizedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  for (const name of BLOCKED_HEADERS) headers.delete(name)
  return fetch(input, {
    ...init,
    headers,
    // Cross-origin proxy: avoid credentialed CORS mode
    credentials: 'omit',
  })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'aprendamosjuntos' },
      global: {
        fetch: sanitizedFetch,
      },
    },
  )
}
