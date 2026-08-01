#!/bin/sh
set +e

DIRECT_URL=${DATABASE_URL}

case "$DIRECT_URL" in
  *":6543/"*) DIRECT_URL=$(echo "$DIRECT_URL" | sed 's/:6543\//:5432\//') ;;
esac

echo "dbpush.sh -> aplicando esquema contra: $(echo "$DIRECT_URL" | sed -E 's|//[^@]*@|//***@|' | cut -d'?' -f1)"
DATABASE_URL="$DIRECT_URL" timeout 120 npx prisma db push --skip-generate
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  echo "WARN: prisma db push no completó (status $STATUS). Continuando arranque."
fi
exit 0
