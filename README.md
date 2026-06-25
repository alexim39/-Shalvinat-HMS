# Shalvinat HMS

Full-stack Hospital Management System for Shalvinat Healthcare Limited, Bonny Island.

## Stack

- Angular standalone frontend
- Node.js, Express, TypeScript API
- MongoDB with Mongoose schemas
- JWT authentication, bcrypt password hashing, API-level RBAC, audit logging

## Project Structure

```text
apps/
  api/                 Express API, Mongoose schemas, seed script, unit tests
  web/                 Angular app with role workstations
docs/
  API_ROUTES.md        Endpoint documentation
  DATABASE_SCHEMA.md   Data model documentation
  USER_FLOWS.md        Implemented journeys
docker-compose.yml     Local MongoDB
```

## Quick Start

1. Install dependencies:

   ```powershell
   npm.cmd install
   npm.cmd run install:all
   ```

2. Start MongoDB:

   ```powershell
   docker compose up -d mongo
   ```

3. Copy API env values:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

4. Seed demo accounts:

   ```powershell
   npm.cmd run seed
   ```

5. Run both apps:

   ```powershell
   npm.cmd run dev
   ```

Frontend: `http://localhost:4200`

API: `http://localhost:4000/api`

## Demo Accounts

All seeded accounts use password `Shalvinat@2026!`.

- `director@shalvinat.local`
- `reception@shalvinat.local`
- `nurse@shalvinat.local`
- `doctor@shalvinat.local`
- `pharmacy@shalvinat.local`
- `lab@shalvinat.local`
- `radiology@shalvinat.local`
- `manager@shalvinat.local`

## Documentation

- [Database schema](docs/DATABASE_SCHEMA.md)
- [API routes](docs/API_ROUTES.md)
- [Implemented user flows](docs/USER_FLOWS.md)

## Verification

```powershell
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/api test
npm.cmd --prefix apps/web run build
```
