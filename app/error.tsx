"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap" style={{ paddingTop: "20vh" }}>
      <h1>Something went wrong</h1>
      <p>Check your connection and try again. If it keeps happening, call the restaurant.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </main>
  );
}
