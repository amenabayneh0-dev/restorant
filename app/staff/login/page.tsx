import type { Metadata } from "next";
import { login } from "../actions";
export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="wrap" style={{ paddingTop: "12vh", maxWidth: 420 }}>
      <h1>Staff sign in</h1>
      <form action={login}>
        <label className="fld">Email<input name="email" type="email" autoComplete="username" required /></label>
        <label className="fld">Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="err" role="alert">Wrong email or password.</p>}
        <button className="btn solid">Sign in</button>
      </form>
    </main>
  );
}
