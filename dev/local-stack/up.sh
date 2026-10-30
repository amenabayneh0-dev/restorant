#!/bin/bash
# bring up the local Supabase stand-in stack (only starts what is missing)
ps -eo args | grep -q "^/usr/lib/postgresql/16/bin/postgres -D" || { su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pg/data -o '-p 5433 -k /tmp/pg' -l /tmp/pg/log start" >/dev/null 2>&1; sleep 3; }
cd /tmp/prest && node mkjwt.js '{"role":"anon"}' > anon.jwt
ps -eo args | grep -q "^./postgrest pgrst" || { setsid nohup ./postgrest pgrst.conf > pgrst.log 2>&1 < /dev/null & sleep 2; }
ps -eo args | grep -q "^node proxy.js" || { setsid nohup node proxy.js > proxy.log 2>&1 < /dev/null & sleep 1; }
