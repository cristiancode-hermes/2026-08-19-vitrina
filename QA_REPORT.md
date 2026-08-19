# QA Report — 2026-08-19 vitrina

**Project:** Museo B2C con entradas por franja horaria, retención server-side, QR y puntos socio derivados  
**Stack:** Angular 22 + NestJS 11 + SQLite (better-sqlite3) + JWT  
**Author:** Hermes Daily Builder  
**QA agent:** qa-tester-deployer (cron)  
**Date:** 2026-08-19  

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc -p tsconfig.json --incremental false` | ✅ PASS | `dist/main.js` present |
| Web `ng build` | ✅ PASS | `apps/web/dist/web/browser/index.html`, `baseHref=/` |
| Design lock | ✅ OK | `check-final-design.sh` exit 0 — no visual redesign applied |
| Unit tests (API) | ✅ PASS | **20/20** Jest |

## ✅ 2. Test Results

20 test cases — ALL PASSED

| Suite | Result |
|-------|--------|
| API Jest suite | 20/20 |

No new unit tests required — existing coverage adequate for auth/tickets/stats flows; endpoint + browser smoke covered the transactional cycle.

## ✅ 3. Runtime / Endpoint Verification

| Check | Status | Notes |
|-------|--------|-------|
| `POST /api/auth/login` demo | ✅ 201 | `{ accessToken, user }` |
| `POST /api/auth/login` admin | ✅ 201 | role admin |
| `GET /api/exhibitions` | ✅ 200 | 4 exposiciones seed |
| `GET /api/exhibitions/:id/slots` | ✅ 200 | freeSeats live |
| Hold `POST /api/tickets` | ✅ 201 | status=pending, expiresAt server-side |
| Confirm `POST /api/tickets/:id/confirm` | ✅ 201 | code VT-*, status confirmed |
| Re-confirm | ✅ 409 | mutex / state guard |
| List ↔ detail totals | ✅ | totalCents match (e.g. 1400) |
| `GET /api/admin/stats` | ✅ 200 | kpis + revenueSeries + occupancyToday + byExhibition |
| Sweeper / expiresAt / 409 | ✅ | present in tickets.service |

## ✅ 4. Browser Smoke (Puppeteer prod)

**16/16 PASS** against `https://vitrina.proyectos.cristiancode.dev`

| Check | Verdict |
|-------|---------|
| Home renders | ✅ |
| Demo creds under login (no autocomplete) | ✅ |
| Login visitor → `vitrina_token` | ✅ |
| `/exposiciones/:id` dynamic route | ✅ no blank / no Error inesperado |
| `/obras/:id` dynamic route | ✅ |
| `/mis-visitas` + `/mis-visitas/:id` | ✅ |
| List ↔ detail totalCents | ✅ |
| Admin login + `/admin` charts | ✅ SVG with axes (0€…136€, 08-19) |
| Button contrast AA sample | ✅ |
| Console clean | ✅ |

Screenshots: `/opt/data/cache/vitrina-smoke/`

### Quality rules (Cristian 2026-08-14)

| Rule | Verdict |
|------|---------|
| Dynamic routes smoke | ✅ |
| Totals lista ↔ detalle | ✅ |
| Gráficos reales (ejes/fechas) | ✅ admin SVG |
| Contraste botones | ✅ |
| Capa de valor de verdad | ✅ ciclo franja timed-entry (hold→confirm→QR, sweeper, 409) |

### Ciclo transaccional

| Regla | Verdict |
|-------|---------|
| A. Estado real en backend | ✅ pending/confirmed/… |
| B. expiresAt servidor | ✅ |
| C. Sweeper ~30s | ✅ |
| D. Bloqueo doble venta 409 | ✅ |
| E. Comprobante QR | ✅ code + visit detail |
| F. Puntos derivados | ✅ demo 90 pts post-seed/confirm |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| Auth interceptor Bearer | ✅ clean (no `***` literal) |
| Passwords hashed (bcrypt) | ✅ seed uses passwordHash |
| JWT on protected routes | ✅ |
| No secrets in repo | ✅ |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| API port | ✅ 3066 | `node dist/main.js` |
| Caddy | ✅ | `vitrina.proyectos.cristiancode.dev` → browser + `/api*` → :3066 |
| manage-apis.sh | ✅ | PORTS/NAMES/DIRS aligned (53) |
| Excel | ✅ | Row 84 Vitrina |
| Landing proyectos.cristiancode.dev | ✅ | productividad category + push |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-19-vitrina |
| Portfolio es/en/pt | ✅ | heading-199, theme_vitrina |
| Capture config | ✅ | config.mjs + prod-capture token key |
| Screenshots | ✅ | vitrina.png / vitrina-m.png (logged-in home) |

### Link verification

| Link | HTTP |
|------|------|
| href https://vitrina.proyectos.cristiancode.dev | 200 |
| deep /exposiciones/1 | 200 |
| link2 README blob | 200 |
| link3 repo | 200 |
| cristiancode.dev/project/vitrina/ | 200 |
| /en/project/vitrina/ | 200 |
| /pt/project/vitrina/ | 200 |
| /assets/vitrina.png | 200 |
| hermes data-search=vitrina | ≥1 |
| live dist md5 == local | ✅ |

## Minor notes

- `revenueSeries` seed window may show 1 day of data; chart still has axes/labels/tooltips.
- Agora remains outside manage-apis (pre-existing; not in scope).
- Capture uses namespaced `vitrina_token` (added to both injection blocks).

## Summary

**OVERALL: PASS ✅**

Published: ✅ Caddy (vitrina.proyectos.cristiancode.dev :3066), ✅ Portfolio (es+en+pt), ✅ Landing, ✅ Excel, ✅ GitHub  
