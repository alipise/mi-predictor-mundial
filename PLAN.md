# PLAN.md — Mundial 2026 IA Predictor

Plan de implementación por fases. Objetivo: app en Next.js que recalcula a diario y proyecta todos los mercados estadísticos por partido, lista para grabar contenido.

---

## Arquitectura general

```
API-Football (RapidAPI)
        |
        v
lib/api/football.ts          wrapper tipado, revalida cada hora
        |
        v
lib/cron/run.ts              ejecuta el ciclo diario (pnpm cron:run / Vercel Cron)
        |
        v
lib/model/                   motor de predicción — sin imports de app/ ni UI
  poisson.ts                 distribución bivariada de resultados
  dixon-coles.ts             corrección para resultados 0-0 / 1-0 / 0-1 / 1-1
  mercados.ts                deriva todos los mercados desde la distribución
  goleadores.ts              probabilidades por jugador
  index.ts                   predecirPartido(partido, stats) → Prediccion
        |
        v
lib/db/                      SQLite via better-sqlite3
  schema.ts                  CREATE TABLE equipos / partidos / predicciones
  queries.ts                 funciones tipadas, sin ORM
        |
        v
src/app/                     Next.js App Router — Server Components por defecto
  page.tsx                   home: grupos + próximos partidos
  partido/[id]/page.tsx      detalle: marcador predicho + todos los mercados
  grupo/[grupo]/page.tsx     clasificación proyectada del grupo
  api/cron/route.ts          POST protegido por CRON_SECRET — solo para Vercel Cron
```

**Flujo de datos en UI**: Server Action llama a `queries.ts` → devuelve datos ya procesados al componente → sin `useEffect`, sin fetch en cliente salvo interactividad explícita.

**Historial**: cada ejecución del cron inserta una fila nueva en `predicciones` (nunca hace UPDATE). Las páginas muestran siempre la más reciente; el historial se lee con `ORDER BY timestamp DESC`.

---

## Estado actual

- [x] Next.js 15 + Tailwind 4 + shadcn/ui inicializados
- [x] Estructura de carpetas creada
- [x] Tipos base: `Equipo`, `Partido`, `Prediccion`, `PrediccionMercado`
- [x] Schema SQLite inicial: `partidos`, `predicciones`
- [x] Wrapper API-Football (`lib/api/football.ts`)
- [x] Stub del motor de predicción (`lib/model/index.ts`)
- [x] Entry point cron (`pnpm cron:run`)
- [x] Design tokens en `globals.css` (fondo `#0c0e10`, acento `#00e5a0`, monospace)
- [x] Schema completo: `equipos`, `jugadores`, `estadisticas_equipo`
- [x] `lib/db/queries.ts`: todas las funciones tipadas
- [x] Motor de predicción real: Poisson bivariada + Dixon-Coles, todos los mercados
- [x] `scripts/seed.ts`: 48 equipos + fixture fase de grupos (estático/API)
- [x] `lib/cron/run.ts`: ciclo completo con fetch de stats + predicción + persistencia
- [x] `app/api/cron/route.ts`: endpoint POST protegido por CRON_SECRET
- [x] UI: páginas `/`, `/partido/[id]`, `/grupo/[grupo]`
- [x] Componentes: MarcadorPredicho, MercadoBarra, DistribucionGoles, GoleadoresRanking, HistorialPredicciones
- [x] Charts custom: BarraHorizontal, HeatmapResultados, SparklineHistorial (SVG inline, sin Recharts default)

---

## Fase 1 — Datos e infraestructura

### 1a. Schema completo

Ampliar `lib/db/schema.ts`:

```sql
CREATE TABLE equipos (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL,       -- "ARG", "BRA"
  grupo TEXT NOT NULL,        -- "A" a "L"
  logo_url TEXT
);

CREATE TABLE jugadores (
  id INTEGER PRIMARY KEY,
  equipo_id INTEGER REFERENCES equipos(id),
  nombre TEXT NOT NULL,
  posicion TEXT,
  numero INTEGER
);

CREATE TABLE estadisticas_equipo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipo_id INTEGER REFERENCES equipos(id),
  partido_api_id INTEGER,     -- ID del partido en API-Football
  goles_favor INTEGER,
  goles_contra INTEGER,
  xg_favor REAL,
  xg_contra REAL,
  corners INTEGER,
  tarjetas_amarillas INTEGER,
  tarjetas_rojas INTEGER,
  fecha TEXT
);
```

### 1b. Script de seed

`scripts/seed.ts` — correr una sola vez:
1. Descargar fixture del Mundial 2026 (liga ID a confirmar en API-Football)
2. Insertar equipos en `equipos`
3. Insertar partidos en `partidos`

```bash
pnpm tsx scripts/seed.ts
```

### 1c. Capa de queries

`lib/db/queries.ts` — funciones exportadas sin ORM:

```ts
getPartidosByFase(fase: Partido["fase"]): Partido[]
getPartidosGrupo(grupo: string): Partido[]
getPrediccionLatest(partidoId: number): Prediccion | null
getHistorialPredicciones(partidoId: number): Prediccion[]
upsertPrediccion(p: Prediccion): void   // INSERT, nunca UPDATE
getEstadisticasEquipo(equipoId: number, ultimos: number): EstadisticaEquipo[]
```

### 1d. Cron real + endpoint Vercel

`lib/cron/run.ts`:
1. `initSchema()`
2. Obtener partidos no jugados de los próximos 7 días
3. Para cada partido: buscar estadísticas recientes de ambos equipos via API-Football
4. Llamar `predecirPartido(partido, stats)`
5. Persistir con `upsertPrediccion()`

`app/api/cron/route.ts`:
```ts
// Valida header: Authorization: Bearer CRON_SECRET
// Llama al mismo main() de lib/cron/run.ts
```

Variables de entorno necesarias en esta fase:
```
RAPIDAPI_KEY=
CRON_SECRET=
```

---

## Fase 2 — Motor de predicción

Todo en `lib/model/`. Sin imports de `app/`, `components/`, ni librerías de UI.

### Algoritmo: Poisson bivariada + Dixon-Coles

**Paso 1 — Fuerza de ataque/defensa**

Para cada equipo, con sus últimos N partidos:
```
ataque_i    = media(goles_anotados_i) / media_liga(goles_anotados)
defensa_i   = media(goles_recibidos_i) / media_liga(goles_recibidos)
```

**Paso 2 — Lambdas esperados**

```
lambda_local     = ataque_local * defensa_visitante * media_liga * factor_local
lambda_visitante = ataque_visitante * defensa_local * media_liga
```

`factor_local` ≈ 1.15 para fase de grupos en sedes neutrales del Mundial.

**Paso 3 — Distribución bivariada**

Generar matriz de probabilidades P[i][j] para i,j ∈ [0..6] con corrección Dixon-Coles para resultados (0,0), (1,0), (0,1), (1,1).

**Paso 4 — Derivar mercados**

Desde P[i][j]:
- Resultado 1X2: sumar columnas de la matriz
- Total goles: acumular P donde i+j > linea
- Ambos anotan: P donde i > 0 AND j > 0
- Goles local/visitante: suma marginal por fila/columna
- El resultado más probable: argmax de la matriz (para mostrar "predicción principal")

**Paso 5 — Tarjetas y corners** (modelo separado, no depende de goles)

Usar regresión sobre media de tarjetas/corners de los últimos 10 partidos de cada equipo. Líneas Over/Under calculadas desde la media combinada.

**Paso 6 — Goleadores**

```
P(gol_jugador) = 1 - (1 - tasa_goles_por_90min * minutos_esperados/90) ^ lambda_equipo
```

Archivos:
- `lib/model/poisson.ts`
- `lib/model/dixon-coles.ts`
- `lib/model/mercados.ts`
- `lib/model/goleadores.ts`
- `lib/model/index.ts` — función pública: `predecirPartido(partido, stats): Prediccion`

---

## Fase 3 — UI

### Design tokens (ya definidos en `globals.css`)

```
--background: #0c0e10
--surface:    #13171b
--border:     #1e2530
--foreground: #e8edf2
--muted:      #6b7c90
--accent:     #00e5a0
font:         JetBrains Mono / ui-monospace
```

Regla de oro: los números son el protagonista. El layout debe hacer que el marcador predicho y las probabilidades sean lo primero que ve el ojo. Sin cards flotantes, sin gradientes, sin íconos decorativos.

### Página `/` — Home

```
[MUNDIAL 2026 IA PREDICTOR]

PRÓXIMOS PARTIDOS
  ARG vs BRA  •  Grupo C  •  15 Jun  →  [ver predicción]
  ...

GRUPOS
  [A]  [B]  [C]  ...  [L]
  cada celda: 4 equipos + % clasificar (número grande, acento)
```

Componentes:
- `components/home/ProximosPartidos.tsx` — Server Component
- `components/home/GridGrupos.tsx` — Server Component

### Página `/partido/[id]` — Detalle

Layout desktop: dos columnas. Móvil: stack.

```
ARG  2 - 1  BRA          ← marcador más probable, tipografía grande
Grupo C • 15 Jun • Estadio X

RESULTADO                 DISTRIBUCIÓN DE RESULTADOS
● ARG gana  42%           [heatmap 0-0 a 3-3, celdas coloreadas]
● Empate    28%
● BRA gana  30%

TOTAL GOLES               AMBOS ANOTAN
Over 2.5  54%             Sí  58%
Under 2.5 46%             No  42%

TARJETAS            CORNERS
Over 3.5  61%       Over 9.5  55%

GOLEADORES PROBABLES
  1. L. Messi      34%  ████████░░
  2. E. Fernández  18%  ████░░░░░░
  ...

— Predicción calculada: 10 Jun 2026, 03:00 UTC
  [ver historial]  ← colapsable, sparkline de cambios
```

Componentes:
- `components/partido/MarcadorPredicho.tsx` — número grande, sin borde
- `components/partido/MercadoBarra.tsx` — barra horizontal custom, sin Recharts
- `components/partido/DistribucionGoles.tsx` — grid heatmap 4x4, coloreado con CSS
- `components/partido/GoleadoresRanking.tsx`
- `components/partido/HistorialPredicciones.tsx` — "use client", colapsable

### Página `/grupo/[grupo]` — Grupo

```
GRUPO C

CLASIFICACIÓN PROYECTADA
  #  Equipo       Pts esp.  GF  GC  P(clasif.)
  1  Argentina    7.2       8   3     91%
  2  Brasil       6.1       6   4     78%
  ...

PARTIDOS
  ARG vs BRA  •  15 Jun  →  ARG gana 42%  [ver →]
```

### Componentes de gráfica custom

Todos en `components/charts/`. Cero estilos default de Recharts.

- `BarraHorizontal.tsx` — probabilidad simple, color `--accent` para el líder
- `HeatmapResultados.tsx` — SVG inline, sin librería
- `SparklineHistorial.tsx` — SVG inline, cambios de probabilidad a lo largo del tiempo

---

## Fase 4 — Viralidad y pulido

- **Imagen OG por partido** (`app/partido/[id]/opengraph-image.tsx` con `@vercel/og`): marcador predicho grande + logos de equipos. Se comparte directo a Instagram Stories.
- **Aciertos**: una vez jugado el partido, marcar si la predicción principal fue correcta. Contador global "X/Y partidos acertados".
- **Meta tags dinámicos**: `generateMetadata` en cada `page.tsx` de partido para WhatsApp/Telegram preview.

---

## Decisiones técnicas abiertas

| Tema | Opción A | Opción B | Criterio de decisión |
|---|---|---|---|
| DB en producción | SQLite local (solo dev/VPS) | Turso (`@libsql/client`) | Si se despliega en Vercel, usar Turso — mismo schema, driver casi idéntico |
| Imagen OG | `@vercel/og` (Edge) | `satori` manual | Preferir `@vercel/og` salvo que se necesite layout muy custom |
| Caché de API | `next: { revalidate }` en fetch | guardar raw JSON en DB | Guardar en DB — los créditos de API-Football son limitados, no llamar dos veces el mismo recurso el mismo día |

---

## Variables de entorno

```
RAPIDAPI_KEY=           # API-Football v3 (RapidAPI)
FOOTBALL_DATA_TOKEN=    # fallback football-data.org
CRON_SECRET=            # header Authorization del endpoint /api/cron
```
