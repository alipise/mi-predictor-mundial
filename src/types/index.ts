export type Equipo = {
  id: number
  nombre: string
  codigo: string
  grupo: string
  logoUrl: string | null
}

export type Partido = {
  id: number
  fase: "grupo" | "octavos" | "cuartos" | "semis" | "final"
  grupo?: string
  equipoLocal: Equipo
  equipoVisitante: Equipo
  fechaUtc: string
  estadio: string
}

export type PrediccionMercado = {
  mercado: string
  linea?: number
  probabilidades: Record<string, number>
}

export type Prediccion = {
  partidoId: number
  timestamp: string
  mercados: PrediccionMercado[]
  goleadoresProbables: Array<{ jugadorId: number; nombre: string; probabilidad: number }>
}

export type Jugador = {
  id: number
  equipoId: number
  nombre: string
  posicion: string | null
  numero: number | null
  tasaGolesPor90: number
}

export type EstadisticaEquipo = {
  equipoId: number
  partidoApiId: number
  fecha: string
  golesFavor: number
  golesContra: number
  xgFavor: number | null
  xgContra: number | null
  corners: number
  tarjetasAmarillas: number
  tarjetasRojas: number
}

export type StatsPartido = {
  local: EstadisticaEquipo[]
  visitante: EstadisticaEquipo[]
  jugadoresLocal: Jugador[]
  jugadoresVisitante: Jugador[]
}
