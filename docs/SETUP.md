# Setup

## Local
```bash
npm install
cp .env.example .env
npm run deploy:commands
npm run dev
```

## Supabase
Apply `supabase/migrations/001_full_schema.sql` if the schema is not already present.

## Railway
Push the folder to GitHub, connect the repository, and add all `.env` values as Railway Variables.

Never commit `.env` or API secrets.