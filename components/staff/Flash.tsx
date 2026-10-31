export function Flash({ saved, err }: { saved?: string; err?: string }) {
  if (err) return <p className="notice bad" role="alert">{err}</p>;
  if (saved) return <p className="notice good" role="status">{saved === "1" ? "Saved." : `Saved: ${saved}.`}</p>;
  return null;
}
