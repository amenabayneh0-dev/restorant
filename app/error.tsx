"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap" style={{ paddingTop: "20vh" }}>
      <h1>The menu isn't loading</h1>
      <p>Check your connection and try again. If it keeps happening, call the restaurant.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </main>
  );
}
