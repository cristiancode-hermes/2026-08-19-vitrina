# API — Vitrina

Base: `/api` · Swagger: `/api/docs` · Puerto default `3066`

## Auth

| Method | Path | Body | Auth |
|--------|------|------|------|
| POST | `/auth/register` | `{username,email,name,password}` | — |
| POST | `/auth/login` | `{identifier,password}` | — |
| GET | `/auth/profile` | — | JWT |

Response auth: `{ accessToken, user: {id,username,email,name,role,points} }`

## Exhibitions (público)

| Method | Path | Query |
|--------|------|-------|
| GET | `/exhibitions` | `type`, `search`, `featured`, `withSlotsToday`, `maxPriceCents` |
| GET | `/exhibitions/:id` | `date=YYYY-MM-DD` → slots del día + tariffs + artworks |
| GET | `/artworks/:id` | |
| GET | `/exhibitions/:id/slots` | `date` |

## Favoritos

| Method | Path | Auth |
|--------|------|------|
| POST | `/favorites/:exhibitionId` | JWT toggle |
| GET | `/favorites` | JWT |

## Tickets

| Method | Path | Body |
|--------|------|------|
| GET | `/tickets` | lista del usuario |
| GET | `/tickets/:id` | detalle + `lines`, `addOns`, `qrSvg`, `linesTotalCents` |
| POST | `/tickets` | `{slotId, lines:[{tariff,qty}], addOns?:[{code,qty}]}` |
| POST | `/tickets/:id/confirm` | pago simulado |
| POST | `/tickets/:id/cancel` | libera cupo |

Errores: `409` cupo, `400` validación/expirado, `403` ajeno.

## Reviews

| Method | Path |
|--------|------|
| GET | `/exhibitions/:id/reviews` |
| POST | `/exhibitions/:id/reviews` | `{rating,body}` requiere ticket `used` |

## Admin

| Method | Path |
|--------|------|
| GET | `/admin/stats` | kpis, revenueSeries, occupancyToday, byExhibition |
| GET/POST | `/admin/exhibitions` |
| PUT | `/admin/exhibitions/:id` |
| POST | `/admin/slots` | `{exhibitionId,date,startTime,endTime,capacity}` |

## Dinero

Centavos enteros. UI formatea EUR.
