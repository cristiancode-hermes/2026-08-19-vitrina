# Vitrina

Museo B2C — exposiciones, franjas horarias y compra de entradas con retención temporal en servidor.

**Stack:** Angular 22 (zoneless) + NestJS + TypeORM + better-sqlite3  
**Design system:** Pátina de Bronce (light-first)

## Demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Visitante | `demo@vitrina.dev` | `demo1234` |
| Admin | `admin@vitrina.dev` | `demo1234` |

## Desarrollo

```bash
# API (puerto 3066)
cd apps/api && npm run build && PORT=3066 node dist/main.js

# Web (proxy /api → 3066)
cd apps/web && npx ng serve --port 4200
```

## Build

```bash
npm run build:api
npm run build:web
```

## Tests

```bash
npm run test:api   # 20 unit tests (tarifas, mutex, estados, cupos)
```

## Capas de valor

1. **Transaccional:** hold 15 min (`expiresAt` servidor) → confirm → QR; sweeper 30s; mutex anti doble-venta.
2. **Puntos:** 10 pts × plaza confirmada/usada (derivados, no seed arbitrario).
3. **Admin:** ingresos por día + ocupación real con ejes y tooltips.
