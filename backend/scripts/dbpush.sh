#!/bin/sh
set -e

DIRECT_URL=${DATABASE_URL}

case "$DIRECT_URL" in
  *"pooler.supabase.com"*)
    DIRECT_URL=$(echo "$DIRECT_URL" | sed -E 's|//([A-Za-z0-9_.-]+)\.([^.@:]+):([^@]+)@[^/]+|//\1.\2:\3@db.\2.supabase.co:5432|')
    ;;
esac

echo "dbpush.sh -> aplicando esquema contra: $(echo "$DIRECT_URL" | sed -E 's|//[^@]+@|//***@|' | cut -d'?' -f1)"
DATABASE_URL="$DIRECT_URL" timeout 120 npx prisma db push --skip-generate
