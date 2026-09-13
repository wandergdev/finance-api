# API de Finanzas Personales

API con lógica de negocio real para el control de finanzas personales: transacciones, categorías y presupuestos mensuales con alertas de sobregiro, además de reportes (balance, gasto por categoría, resumen mensual).

## Stack

- Node.js + TypeScript (Express 5)
- Prisma ORM 7 + PostgreSQL (driver adapter `@prisma/adapter-pg`)
- JWT para autenticación, `bcryptjs` para hashing de contraseñas
- Validación de requests con `zod`
- Docker Compose para levantar Postgres en local

## Cómo correrlo

```bash
cp .env.example .env      # ajusta JWT_SECRET si quieres
docker compose up -d      # levanta Postgres en localhost:5433
npm install
npm run prisma:migrate    # crea las tablas
npm run dev                # http://localhost:4000
```

## Modelo de datos

- **User**: cuenta con email/password.
- **Category**: pertenece a un usuario, tipo `INCOME` o `EXPENSE`.
- **Transaction**: monto positivo asociado a una categoría; el `type` se hereda de la categoría (no se puede registrar un ingreso en una categoría de gasto ni viceversa).
- **Budget**: límite mensual por categoría de gasto; solo aplica a categorías `EXPENSE`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crea usuario, devuelve JWT |
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET/POST | `/api/categories` | Listar / crear categorías |
| PATCH/DELETE | `/api/categories/:id` | Editar / eliminar (falla con 409 si tiene transacciones) |
| GET/POST | `/api/transactions` | Listar (con filtros `from`, `to`, `categoryId`, `type`, paginado) / crear |
| GET/PATCH/DELETE | `/api/transactions/:id` | Detalle / editar / eliminar |
| GET/POST | `/api/budgets` | Listar (con `spent`, `remaining`, `overBudget`, `percentUsed` calculados) / crear |
| PATCH/DELETE | `/api/budgets/:id` | Editar límite / eliminar |
| GET | `/api/reports/balance?from&to` | Ingresos, gastos y balance del rango |
| GET | `/api/reports/by-category?from&to` | Totales agrupados por categoría |
| GET | `/api/reports/monthly?year=2026` | Desglose mes a mes de un año |

Todas las rutas bajo `/api/categories`, `/api/transactions`, `/api/budgets` y `/api/reports` requieren `Authorization: Bearer <token>` y solo devuelven/afectan datos del usuario autenticado.

## Reglas de negocio destacadas

- Una transacción no puede crearse contra una categoría de otro usuario (404) ni con monto negativo (400 de validación).
- Un presupuesto solo puede crearse sobre una categoría `EXPENSE` (409 si no lo es) y es único por categoría+mes+año (409 si se duplica).
- Una categoría con transacciones asociadas no se puede eliminar (409, restricción a nivel de base de datos).
- `GET /api/budgets` calcula en cada request cuánto se ha gastado ese mes en la categoría del presupuesto, comparándolo contra el límite.

> **Nota sobre el secreto JWT:** el `.env.example` trae un placeholder; `.env` (ignorado por git) debe usar un valor real solo en local. Para cualquier despliegue, usa una variable de entorno gestionada por la plataforma.
