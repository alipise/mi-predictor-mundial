const BASE_URL = "https://v3.football.api-sports.io"

// World Cup 2026 league ID on API-Football (confirm at /leagues?name=FIFA+World+Cup&season=2026)
export const WORLD_CUP_2026_LEAGUE_ID = 1

type FetchOptions = { cache?: boolean }

async function apiFetch<T>(endpoint: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "x-apisports-key": process.env.RAPIDAPI_KEY ?? "",
    },
    ...(opts.cache !== false && { next: { revalidate: 3600 } }),
  })
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${endpoint}`)
  const json = await res.json()
  return json.response as T
}

export type ApiFixture = {
  fixture: { id: number; date: string; venue: { name: string } }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  league: { round: string; group?: string }
}

export type ApiTeam = {
  team: { id: number; name: string; code: string; logo: string }
}

export type ApiFixtureStats = {
  team: { id: number }
  statistics: Array<{ type: string; value: number | string | null }>
}

export type ApiPlayer = {
  player: { id: number; name: string }
  statistics: Array<{
    team: { id: number }
    games: { position: string; number: number; minutes: number }
    goals: { total: number | null }
  }>
}

export const footballApi = {
  getFixtures: (season = 2026) =>
    apiFetch<ApiFixture[]>(
      `/fixtures?league=${WORLD_CUP_2026_LEAGUE_ID}&season=${season}`,
      { cache: false }
    ),

  getTeams: (season = 2026) =>
    apiFetch<ApiTeam[]>(
      `/teams?league=${WORLD_CUP_2026_LEAGUE_ID}&season=${season}`,
      { cache: false }
    ),

  getFixtureStats: (fixtureId: number) =>
    apiFetch<ApiFixtureStats[]>(`/fixtures/statistics?fixture=${fixtureId}`, { cache: false }),

  getPlayers: (teamId: number, season = 2026) =>
    apiFetch<ApiPlayer[]>(
      `/players?team=${teamId}&season=${season}&league=${WORLD_CUP_2026_LEAGUE_ID}`,
      { cache: false }
    ),

  getLastFixtures: (teamId: number, last = 10) =>
    apiFetch<ApiFixture[]>(`/fixtures?team=${teamId}&last=${last}`, { cache: false }),
}
