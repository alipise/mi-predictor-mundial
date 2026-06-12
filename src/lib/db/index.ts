import { createClient, type Client } from "@libsql/client"

let _client: Client | undefined

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:data/mundial.db",
      authToken: process.env.TURSO_AUTH_TOKEN ?? undefined,
    })
  }
  return _client
}
