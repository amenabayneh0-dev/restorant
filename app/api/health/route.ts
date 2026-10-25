import { envReport } from "@/lib/env";
import { adminClient } from "@/lib/supabase-admin";
import { publicClient } from "@/lib/supabase-public";

export const dynamic = "force-dynamic";

// Open /api/health after deploying. It reports (without revealing any secret) which settings are missing and
// whether each Supabase connection and the database migrations work. Safe to delete once everything is green.
export async function GET() {
  const env = envReport();
  const checks: Record<string, string> = {};
  const run = async (name: string, fn: () => Promise<string | null>) => {
    try { checks[name] = (await fn()) ?? "ok"; } catch (e) { checks[name] = `FAILED: ${e instanceof Error ? e.message : "unknown"}`; }
  };
  await run("public_read_menu", async () => {
    const { data, error } = await publicClient().from("restaurant_settings").select("name").maybeSingle();
    if (error) return `FAILED: ${error.message}`;
    return data ? null : "FAILED: restaurant_settings is empty. Run supabase/migrations/0002_hardening.sql";
  });
  await run("server_secret_key", async () => {
    const { error } = await adminClient().rpc("get_order_tracking", { p_token_hash: "health-check" });
    return error ? `FAILED: ${error.message}` : null;
  });
  const ok = Object.values(env).every(Boolean) && Object.values(checks).every((c) => c === "ok");
  return Response.json({ ok, env, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
