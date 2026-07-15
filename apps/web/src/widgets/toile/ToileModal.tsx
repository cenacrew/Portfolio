"use client";

import { toilePublicUrl, TOILE_SIZE } from "@portfolio/shared";
import { useEffect, useRef, useState } from "react";
import GreatModal from "../ui/GreatModal";

// 16 pertinent colours: ink/paper/greys, the site navy, warm + cool primaries
// and secondaries, and two skin tones.
const PALETTE = [
  "#0d0c62", "#ffffff", "#000000", "#8a8f98",
  "#e11d48", "#f97316", "#f59e0b", "#facc15",
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6",
  "#ec4899", "#78350f", "#f2c9a0", "#8d5524",
];
const SIZES = [4, 10, 20];
type Tool = "brush" | "eraser" | "fill";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Loads a same-origin-safe (CORS) image; resolves null if it can't (empty toile).
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ToileModal({
  widgetId,
  supabaseUrl,
  version,
  title,
  onClose,
}: {
  widgetId: string;
  supabaseUrl: string;
  version: number;
  title: string;
  onClose: () => void;
}) {
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  // Offscreen layers: `base` = the toile loaded at open, `stroke` = this
  // visitor's marks (kept separate so send() can merge them over the LATEST
  // base, honouring last-write-wins without clobbering others mid-draw).
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const strokeRef = useRef<HTMLCanvasElement | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState<Tool>("brush");
  const [size, setSize] = useState(SIZES[1]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the offscreen layers and paint the current toile once on open.
  useEffect(() => {
    const base = document.createElement("canvas");
    base.width = base.height = TOILE_SIZE;
    const stroke = document.createElement("canvas");
    stroke.width = stroke.height = TOILE_SIZE;
    baseRef.current = base;
    strokeRef.current = stroke;
    const bctx = base.getContext("2d")!;
    bctx.fillStyle = "#ffffff";
    bctx.fillRect(0, 0, TOILE_SIZE, TOILE_SIZE);
    loadImage(toilePublicUrl(supabaseUrl, widgetId, version)).then((img) => {
      if (img) bctx.drawImage(img, 0, 0, TOILE_SIZE, TOILE_SIZE);
      setLoaded(true);
      // `composite` is declared just below; it is only *called* here inside an
      // async callback that runs long after the component body has finished
      // evaluating, so the reference is always defined at call time.
      // eslint-disable-next-line react-hooks/immutability
      composite();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the visible canvas = base + this visitor's strokes.
  const composite = () => {
    const d = displayRef.current;
    if (!d || !baseRef.current || !strokeRef.current) return;
    const ctx = d.getContext("2d")!;
    ctx.clearRect(0, 0, TOILE_SIZE, TOILE_SIZE);
    ctx.drawImage(baseRef.current, 0, 0);
    ctx.drawImage(strokeRef.current, 0, 0);
  };

  const pushUndo = () => {
    const ctx = strokeRef.current!.getContext("2d")!;
    undoStack.current.push(ctx.getImageData(0, 0, TOILE_SIZE, TOILE_SIZE));
    if (undoStack.current.length > 25) undoStack.current.shift();
  };

  const undo = () => {
    const snap = undoStack.current.pop();
    if (!snap) return;
    strokeRef.current!.getContext("2d")!.putImageData(snap, 0, 0);
    composite();
  };

  // Map a pointer event to canvas pixel coordinates.
  const toXY = (e: React.PointerEvent) => {
    const d = displayRef.current!;
    const r = d.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * TOILE_SIZE,
      y: ((e.clientY - r.top) / r.height) * TOILE_SIZE,
    };
  };

  const strokeCtx = () => strokeRef.current!.getContext("2d")!;

  const paintTo = (x: number, y: number) => {
    const ctx = strokeCtx();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    if (tool === "eraser") {
      // Remove only this visitor's own marks (reveals the base beneath).
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    const p = last.current ?? { x, y };
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    // A dot so single taps register.
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    last.current = { x, y };
  };

  // Flood fill on the COMPOSITE (base + strokes) so boundaries match what the
  // visitor sees; the filled region is burned into the stroke layer.
  const floodFill = (sx: number, sy: number) => {
    const disp = displayRef.current!.getContext("2d")!;
    const view = disp.getImageData(0, 0, TOILE_SIZE, TOILE_SIZE);
    const sctx = strokeCtx();
    const layer = sctx.getImageData(0, 0, TOILE_SIZE, TOILE_SIZE);
    const px = Math.floor(sx);
    const py = Math.floor(sy);
    const at = (x: number, y: number) => (y * TOILE_SIZE + x) * 4;
    const start = at(px, py);
    const target = [view.data[start], view.data[start + 1], view.data[start + 2]];
    const [fr, fg, fb] = hexToRgb(color);
    if (Math.abs(target[0] - fr) + Math.abs(target[1] - fg) + Math.abs(target[2] - fb) < 8) return;
    const tol = 40;
    const match = (i: number) =>
      Math.abs(view.data[i] - target[0]) <= tol &&
      Math.abs(view.data[i + 1] - target[1]) <= tol &&
      Math.abs(view.data[i + 2] - target[2]) <= tol;
    const seen = new Uint8Array(TOILE_SIZE * TOILE_SIZE);
    const stack = [[px, py]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= TOILE_SIZE || y >= TOILE_SIZE) continue;
      const idx = y * TOILE_SIZE + x;
      if (seen[idx]) continue;
      const i = idx * 4;
      if (!match(i)) continue;
      seen[idx] = 1;
      // Burn the fill colour into both the view (for boundary checks) and layer.
      view.data[i] = fr; view.data[i + 1] = fg; view.data[i + 2] = fb; view.data[i + 3] = 255;
      layer.data[i] = fr; layer.data[i + 1] = fg; layer.data[i + 2] = fb; layer.data[i + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    sctx.putImageData(layer, 0, 0);
    composite();
  };

  const onDown = (e: React.PointerEvent) => {
    if (!loaded) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pushUndo();
    const { x, y } = toXY(e);
    if (tool === "fill") {
      floodFill(x, y);
      return;
    }
    drawing.current = true;
    last.current = null;
    paintTo(x, y);
    composite();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = toXY(e);
    paintTo(x, y);
    composite();
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  // Merge this visitor's strokes over the LATEST toile, then upload.
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const out = document.createElement("canvas");
      out.width = out.height = TOILE_SIZE;
      const octx = out.getContext("2d")!;
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, TOILE_SIZE, TOILE_SIZE);
      // Re-fetch the freshest base so concurrent edits aren't wiped.
      const latest = await loadImage(`${toilePublicUrl(supabaseUrl, widgetId, Date.now())}`);
      octx.drawImage(latest ?? baseRef.current!, 0, 0, TOILE_SIZE, TOILE_SIZE);
      octx.drawImage(strokeRef.current!, 0, 0);
      const dataUrl = out.toDataURL("image/png");
      const res = await fetch("/api/toile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetId, image: dataUrl }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Envoi impossible.");
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  return (
    <GreatModal title={title} onClose={onClose} className="gmodal--toile">
      <div className="toile-modal__grid">
        <div className="toile-modal__stage">
          <canvas
            ref={displayRef}
            width={TOILE_SIZE}
            height={TOILE_SIZE}
            className="toile-modal__canvas"
            style={{ touchAction: "none" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {!loaded && <span className="toile-modal__loading">Chargement…</span>}
        </div>

        <div className="toile-modal__tools">
          <div className="toile-modal__swatches">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`toile-sw${color === c && tool !== "eraser" ? " is-on" : ""}`}
                style={{ background: c }}
                aria-label={`Couleur ${c}`}
                onClick={() => { setColor(c); if (tool === "eraser") setTool("brush"); }}
              />
            ))}
          </div>

          <div className="toile-modal__row">
            <div className="toile-seg">
              <button className={`toile-seg__b${tool === "brush" ? " is-on" : ""}`} onClick={() => setTool("brush")} aria-label="Pinceau">✏️</button>
              <button className={`toile-seg__b${tool === "fill" ? " is-on" : ""}`} onClick={() => setTool("fill")} aria-label="Pot de peinture">🪣</button>
              <button className={`toile-seg__b${tool === "eraser" ? " is-on" : ""}`} onClick={() => setTool("eraser")} aria-label="Gomme">🧽</button>
            </div>
            <div className="toile-seg">
              {SIZES.map((s) => (
                <button key={s} className={`toile-seg__b${size === s ? " is-on" : ""}`} onClick={() => setSize(s)} aria-label={`Épaisseur ${s}`}>
                  <span style={{ display: "inline-block", width: s / 1.6, height: s / 1.6, borderRadius: "50%", background: "currentColor" }} />
                </button>
              ))}
            </div>
            <button className="toile-seg__b toile-seg__b--wide" onClick={undo} aria-label="Annuler">↶</button>
          </div>

          {error && <p className="toile-modal__err">{error}</p>}

          <div className="toile-modal__actions">
            <button className="toile-btn toile-btn--ghost" onClick={onClose} disabled={sending}>Fermer</button>
            <button className="toile-btn toile-btn--send" onClick={send} disabled={sending || !loaded}>
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </GreatModal>
  );
}
