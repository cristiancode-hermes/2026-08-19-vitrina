# Architecture — Vitrina

## Monorepo

```
apps/api   NestJS REST + SQLite (better-sqlite3) / opcional Postgres
apps/web   Angular 22 standalone + signals + zoneless
docs/      Arquitectura, API, frontend
```

## Dominio

- **Exhibition** permanente/temporal con `basePriceCents`, obras y franjas (`ExhibitionSlot`).
- **Ticket** estados: `pending → confirmed|cancelled|expired`, `confirmed → used|cancelled`.
- **TicketLine** tarifas: general / reduced / child / member (multiplicadores).
- **Add-ons** audioguía / visita guiada.
- **Favorite**, **Review** (solo con ticket `used`).
- **EmailLog** comprobante simulado al confirmar.

## Ciclo transaccional

1. `POST /tickets` crea `pending` con `expiresAt = now + 15m` (servidor).
2. Mutex serializa check de cupo + incremento `reservedCount`.
3. Sweeper cada 30s → `expireStale()` libera cupo de pending vencidos.
4. `POST /tickets/:id/confirm` genera `code` + `qrToken` + SVG QR + email simulado + puntos.
5. Cancelación de `confirmed` exige ≥24h antes del inicio de franja (TZ Europe/Madrid).

## Auth

JWT Bearer. Roles `visitor` | `admin`. Login por username **o** email (`identifier`).

## Frontend

- Interceptor lee token de `localStorage` (`vitrina_token`) sin inyectar AuthService.
- Shell con nav; login panel lateral de marca.
- Checkout con countdown resync en `visibilitychange`/`focus` desde `expiresAt`.
