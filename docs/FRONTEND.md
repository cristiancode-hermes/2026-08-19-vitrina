# Frontend — Vitrina

## Stack

- Angular 22 standalone, `provideZonelessChangeDetection`, `withFetch()`
- CSS design system (sin runtime Tailwind obligatorio)
- Lazy routes + signals

## Rutas

| Path | Auth | Descripción |
|------|------|-------------|
| `/` | — | Home museo |
| `/exposiciones` | — | Catálogo + filtros |
| `/exposiciones/:id` | — | Detalle, slots, obras, reviews |
| `/obras/:id` | — | Ficha curatorial |
| `/login`, `/registro` | — | Panel lateral de marca |
| `/checkout/:slotId` | JWT | Tarifas → hold → confirm + QR |
| `/mis-visitas`, `/mis-visitas/:id` | JWT | Listado y detalle |
| `/favoritos` | JWT | Favoritos |
| `/admin`, `/admin/exposiciones` | admin | Stats SVG + CRUD |

## Design tokens (Pátina de Bronce)

- Display: Source Serif 4 · Body: DM Sans · Mono: IBM Plex Mono
- Primary `#0B5F52`, accent `#9A3412`, bg `#F4F1EA`
- Dark: `[data-theme="dark"]` via ThemeService
- Sin gradient text / glass / side-stripe

## Login

- Layout: panel lateral de marca
- Inputs vacíos, `autocomplete=off` / `new-password`
- Demo visible: `demo@vitrina.dev` / `demo1234`

## Charts admin

SVG line chart con ejes X (fechas), Y (€), puntos y tooltip; barras de ocupación % del día.
