"use client";
import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image-resize";

/** File input that shrinks the chosen photo in the browser before the form is submitted (phone photos are 5-10 MB). */
export function ImageField({ name, removeName, current, label }: { name: string; removeName: string; current: string | null; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) { setPreview(null); setInfo(""); return; }
    setBusy(true); setInfo("Preparing photo…");
    try {
      const small = await resizeImage(f);
      if (small !== f && input.current) { const dt = new DataTransfer(); dt.items.add(small); input.current.files = dt.files; }
      setPreview(URL.createObjectURL(small));
      setInfo(`${small.name} · ${(small.size / 1024).toFixed(0)} KB${small !== f ? ` (was ${(f.size / 1024 / 1024).toFixed(1)} MB)` : ""}`);
    } catch { setPreview(null); setInfo("Couldn't preview this photo; it will be sent as is."); }
    finally { setBusy(false); }
  }

  const shown = preview ?? current;
  return (
    <div className="imgfield">
      <span className="fld-label">{label}</span>
      {shown && /* eslint-disable-next-line @next/next/no-img-element */ <img src={shown} alt="" className="imgfield-prev" />}
      <label className="fld">Choose a photo (JPEG, PNG or WebP)
        <input ref={input} type="file" name={name} accept="image/jpeg,image/png,image/webp" onChange={onChange} />
      </label>
      <p className="muted small" role="status" aria-live="polite">{busy ? "Preparing photo…" : info}</p>
      {current && <label className="check"><input type="checkbox" name={removeName} /> Remove the current photo</label>}
    </div>
  );
}
