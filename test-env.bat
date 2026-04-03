@echo off
set DATABASE_URL=postgresql://postgres:password@localhost:5432/seller_dashboard_dev
set BETTER_AUTH_SECRET=development-secret-key-32-characters-minimum-length-32
set BETTER_AUTH_URL=http://localhost:3000
set CORS_ORIGIN=http://localhost:3000
set NODE_ENV=development
echo DATABASE_URL is: %DATABASE_URL%
echo Starting server...
cd apps\server
npm run dev:node
