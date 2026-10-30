#!/bin/bash
cd /home/claude/restorant
ANON=$(cat /tmp/prest/anon.jwt); SVC=$(node /tmp/prest/mkjwt.js '{"role":"service_role"}')
# Deliberately messy values: quotes, trailing space, URL with /rest/v1, LEGACY key names
export NEXT_PUBLIC_SUPABASE_URL=" \"http://127.0.0.1:54321/rest/v1/\" "
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON "
export SUPABASE_SERVICE_ROLE_KEY="\"$SVC\""
export TRACKING_TOKEN_SECRET="e2e-tracking-secret-0123456789-abcdefghij-0123456789"
exec npx next start -p 3100
