#!/bin/bash

# Set environment variables in Vercel production

echo "Setting Neon PostgreSQL credentials in Vercel..."

vercel env add DB_HOST production <<< "ep-sweet-fire-are7bve1.c-4.us-west-2.aws.neon.tech"
vercel env add DB_PORT production <<< "5432"
vercel env add DB_NAME production <<< "neondb"
vercel env add DB_USER production <<< "neondb_owner"
vercel env add DB_PASSWORD production <<< "[REDACTED]"

echo "Setting application configuration..."

vercel env add JWT_SECRET production <<< "nigerian-directory-production-jwt-secret-2026-secure-32chars-min"
vercel env add FRONTEND_URL production <<< "https://nigeriandirectory.com"
vercel env add PORT production <<< "3000"
vercel env add NODE_ENV production <<< "production"

echo "Verifying environment variables..."
vercel env ls

echo "✓ Environment variables set!"
echo "Re-deploying to apply changes..."
vercel --prod
