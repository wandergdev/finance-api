# API de Finanzas Personales

API con lógica de negocio real para el control de finanzas personales: transacciones, categorías y presupuestos mensuales con alertas de sobregiro, además de reportes (balance, gasto por categoría, resumen mensual).

La autenticación **no vive aquí**: esta API consume los access tokens que emite
[auth-system-dotnet](https://github.com/wandergdev/auth-system-dotnet) (JWT con refresh rotativo,
roles y 2FA por TOTP). Este servicio solo los verifica.

## Stack

- Node.js + TypeScript (Express 5)
- Prisma ORM 7 + PostgreSQL (driver adapter `@prisma/adapter-pg`)
- Verificación de JWT (HS256) emitidos por `auth-system-dotnet`
- Validación de requests con `zod`
- Docker Compose para levantar Postgres en local

## Cómo correrlo

Necesitas los dos servicios corriendo.

**1. Servicio de identidad** (en el repo `auth-system-dotnet`):

```bash
cd src/AuthSystem.Api
dotnet run                 # http://localhost:5073 (el puerto lo fija su launchSettings.json)
```

**2. Esta API:**

```bash
cp .env.example .env       # JWT_SECRET debe ser el mismo Jwt:Secret del auth-system
docker compose up -d       # levanta Postgres en localhost:5433
npm install
npm run prisma:migrate     # crea las tablas
npm run dev                # http://localhost:4000
```

### Obtener un token

```bash
# 1. Registro (o login) contra el servicio de identidad
curl -X POST http://localhost:5073/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password1"}'
# -> { "tokens": { "accessToken": "...", "refreshToken": "...", ... } }

# 2. Ese accessToken se usa aquí
curl http://localhost:4000/api/transactions \
  -H "Authorization: Bearer <accessToken>"
```

El access token dura **15 minutos**. Cuando expira, el cliente debe llamar a
`POST /api/auth/refresh` del auth-system para obtener uno nuevo — esta API no emite tokens.

## Modelo de datos

- **User**: espejo local de la identidad que vive en `auth-system-dotnet`. La fila se crea sola
  la primera vez que llega un token válido, usando el claim `sub` como id. No guarda contraseñas.
- **Category**: pertenece a un usuario, tipo `INCOME` o `EXPENSE`.
- **Transaction**: monto positivo asociado a una categoría; el `type` se hereda de la categoría (no se puede registrar un ingreso en una categoría de gasto ni viceversa).
- **Budget**: límite mensual por categoría de gasto; solo aplica a categorías `EXPENSE`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/categories` | Listar / crear categorías |
| PATCH/DELETE | `/api/categories/:id` | Editar / eliminar (falla con 409 si tiene transacciones) |
| GET/POST | `/api/transactions` | Listar (con filtros `from`, `to`, `categoryId`, `type`, paginado) / crear |
| GET/PATCH/DELETE | `/api/transactions/:id` | Detalle / editar / eliminar |
| GET/POST | `/api/budgets` | Listar (con `spent`, `remaining`, `overBudget`, `percentUsed` calculados) / crear |
| PATCH/DELETE | `/api/budgets/:id` | Editar límite / eliminar |
| GET | `/api/reports/balance?from&to` | Ingresos, gastos y balance del rango |
| GET | `/api/reports/by-category?from&to` | Totales agrupados por categoría |
| GET | `/api/reports/monthly?year=2026` | Desglose mes a mes de un año |

Todas las rutas bajo `/api` requieren `Authorization: Bearer <accessToken>` y solo devuelven/afectan datos del usuario autenticado. El registro y el login están en el auth-system, no aquí.

## Reglas de negocio destacadas

- Una transacción no puede crearse contra una categoría de otro usuario (404) ni con monto negativo (400 de validación).
- Un presupuesto solo puede crearse sobre una categoría `EXPENSE` (409 si no lo es) y es único por categoría+mes+año (409 si se duplica).
- Una categoría con transacciones asociadas no se puede eliminar (409, restricción a nivel de base de datos).
- `GET /api/budgets` calcula en cada request cuánto se ha gastado ese mes en la categoría del presupuesto, comparándolo contra el límite.

## Autenticación: cómo se valida el token

`requireAuth` verifica firma (HS256), `issuer` y `audience`, y exige los claims `sub` y `email`.
Las tres variables (`JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`) tienen que coincidir con la
sección `Jwt` del auth-system.

> **Nota sobre el secreto JWT:** ambos servicios comparten la misma llave simétrica, así que
> técnicamente cualquiera de los dos podría emitir tokens válidos. Para producción, lo correcto
> es pasar a RS256 (el auth-system firma con la clave privada, esta API valida con la pública).
> El secreto de desarrollo está publicado en el repo del auth-system: rótalo antes de cualquier
> despliegue y pásalo por variable de entorno gestionada por la plataforma.
