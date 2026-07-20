# Despliegue de Efi- Pos

## 1. Base de Datos (Supabase PostgreSQL)

1. Crea cuenta en https://supabase.com
2. New Project → ponle nombre (ej. "efipos")
3. Espera a que se cree la BD (~2 min)
4. Ve a Project Settings → Database → Connection string
5. Copia la **URI** (formato: `postgresql://postgres:xxxx@xxxx.supabase.co:5432/postgres`)
6. Pégala en `backend/.env` como `DATABASE_URL`

## 2. Backend (Render Web Service)

1. Sube el proyecto a GitHub (o cualquier git):

2. En Render: New → Web Service
   - Repo: el que creaste
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npx prisma db push`
   - Start Command: `npm run build && npm start`
   - Plan: Free

3. Variables de entorno en Render:
   - `DATABASE_URL` = (URI de Supabase)
   - `JWT_SECRET` = (genera una clave: `openssl rand -hex 32`)
   - `PORT` = 3001

## 3. Frontend (Vercel)

1. Ve a https://vercel.com (login con GitHub)
2. New Project → Importar el repo
3. Root Directory: `frontend`
4. Framework Preset: **Vite**
5. Variables de entorno:
   - `VITE_API_URL` = `https://tu-backend.onrender.com/api/v1`
6. Deploy → ✅

## 4. Seed de datos (primer usuario)

Crea `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@efipos.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@efipos.com',
      passwordHash: hash,
      role: 'dueno',
    },
  })
  console.log('Usuario admin creado: admin@efipos.com / admin123')
}

main().finally(() => prisma.$disconnect())
```

Agrega al `package.json` del backend:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

Luego ejecuta:
```bash
npx prisma db seed
```

## Costo mensual: **$0**
- Supabase: PostgreSQL 500MB gratis
- Render: Web Service gratis (500h/mes)
- Vercel: Hosting estático + PWA gratis
