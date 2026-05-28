import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://zenerivwdjztmcvxahhn.supabase.co",
  "sb_publishable_UvbD8gSKMZVx0_8zCkz85g_ElkgnyPl"
);

const COLORS = [
  "#c8a96e", "#8a7a5a", "#a08050", "#d4b87a", "#b89860",
  "#c0a060", "#e0c880", "#907040", "#b0883a", "#d8b860",
  "#a87830", "#c89848",
];

function polarToXY(angle, r, cx, cy) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function buildWheelPath(index, total, cx, cy, r) {
  const slice = (2 * Math.PI) / total;
  const start = index * slice - Math.PI / 2;
  const end = start + slice;
  const s = polarToXY(start, r, cx, cy);
  const e = polarToXY(end, r, cx, cy);
  const large = slice > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large},1 ${e.x},${e.y} Z`;
}

function getLabelPos(index, total, cx, cy, r) {
  const slice = (2 * Math.PI) / total;
  const mid = index * slice - Math.PI / 2 + slice / 2;
  return { x: cx + r * 0.65 * Math.cos(mid), y: cy + r * 0.65 * Math.sin(mid), angle: (mid * 180) / Math.PI + 90 };
}

export default function Roue() {
  const [participants, setParticipants] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [done, setDone] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [revealed, setRevealed] = useState({ defi: false, question: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const animRef = useRef(null);

  useEffect(() => {
    loadParticipants();
  }, []);

  async function loadParticipants() {
    setLoading(true);
    const { data, error } = await supabase.from("draws").select("*");
    if (error || !data) { setError("Impossible de charger les participants."); setLoading(false); return; }
    setParticipants(data);
    setRemaining(data);
    setLoading(false);
  }

  function spin() {
    if (spinning || remaining.length === 0) return;
    setWinner(null);
    setRevealed({ defi: false, question: false });
    setSpinning(true);

    const winnerIndex = Math.floor(Math.random() * remaining.length);
    const slice = 360 / remaining.length;
    // On veut que la tranche gagnante arrive en haut (270°)
    const targetAngle = 360 * 8 + (270 - winnerIndex * slice - slice / 2);
    const finalRotation = rotation + targetAngle;

    let start = null;
    const duration = 4000;
    const startRot = rotation;

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = startRot + (finalRotation - startRot) * ease(progress);
      setRotation(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(finalRotation);
        setWinner(remaining[winnerIndex]);
        setSpinning(false);
      }
    }
    animRef.current = requestAnimationFrame(animate);
  }

  function next() {
    if (!winner) return;
    setDone(prev => [...prev, winner]);
    setRemaining(prev => prev.filter(p => p.name !== winner.name));
    setWinner(null);
    setRevealed({ defi: false, question: false });
  }

  const cx = 200, cy = 200, r = 180;
  const n = remaining.length;

  if (loading) return <div style={styles.root}><div style={styles.msg}>Chargement…</div></div>;
  if (error) return <div style={styles.root}><div style={styles.msg}>{error}</div></div>;
  if (participants.length === 0) return <div style={styles.root}><div style={styles.msg}>Aucun tirage trouvé dans la base.</div></div>;

  return (
    <div style={styles.root}>
      <div style={styles.grain} />
      <div style={styles.layout}>

        {/* ROUE */}
        <div style={styles.wheelWrap}>
          <div style={styles.eyebrow}>ROUE DES RÉVÉLATIONS</div>

          {/* Indicateur */}
          <div style={styles.pointer}>▼</div>

          <div style={{ position: "relative", width: 400, height: 400 }}>
            <svg
              width="400" height="400"
              style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : undefined, display: "block" }}
            >
              {n === 0 ? (
                <circle cx={cx} cy={cy} r={r} fill="#2e2b26" />
              ) : (
                remaining.map((p, i) => {
                  const path = buildWheelPath(i, n, cx, cy, r);
                  const label = getLabelPos(i, n, cx, cy, r);
                  const fontSize = n <= 6 ? 13 : n <= 9 ? 11 : 9;
                  return (
                    <g key={p.name}>
                      <path d={path} fill={COLORS[i % COLORS.length]} stroke="#0f0e0c" strokeWidth="2" />
                      <text
                        x={label.x} y={label.y}
                        textAnchor="middle" dominantBaseline="middle"
                        transform={`rotate(${label.angle}, ${label.x}, ${label.y})`}
                        fill="#0f0e0c"
                        fontSize={fontSize}
                        fontFamily="'Courier New', monospace"
                        fontWeight="bold"
                        style={{ userSelect: "none" }}
                      >
                        {p.name.length > 10 ? p.name.slice(0, 9) + "…" : p.name}
                      </text>
                    </g>
                  );
                })
              )}
              <circle cx={cx} cy={cy} r={18} fill="#0f0e0c" stroke="#2e2b26" strokeWidth="2" />
            </svg>
          </div>

          <button
            style={{ ...styles.btn, marginTop: 20, opacity: (spinning || n === 0) ? 0.4 : 1 }}
            onClick={spin}
            disabled={spinning || n === 0}
          >
            {spinning ? "…" : n === 0 ? "Terminé ✦" : "Tourner →"}
          </button>

          {done.length > 0 && (
            <div style={styles.doneList}>
              <div style={styles.doneLabel}>Déjà passés</div>
              {done.map(d => <span key={d.name} style={styles.doneName}>{d.name}</span>)}
            </div>
          )}
        </div>

        {/* PANNEAU RÉSULTAT */}
        <div style={styles.panel}>
          {!winner && (
            <div style={styles.panelEmpty}>
              {n > 0
                ? <span>Tourne la roue pour<br />désigner un participant.</span>
                : <span>Tous les participants<br />sont passés ✦</span>
              }
            </div>
          )}

          {winner && (
            <>
              <div style={styles.winnerName}>{winner.name}</div>

              <div style={styles.revealBlock}>
                <div style={styles.revealLabel}>🎯 DÉFI</div>
                {revealed.defi
                  ? <div style={styles.revealText}>{winner.defi}</div>
                  : <button style={styles.revealBtn} onClick={() => setRevealed(r => ({ ...r, defi: true }))}>
                      Révéler le défi
                    </button>
                }
              </div>

              <div style={styles.divider} />

              <div style={styles.revealBlock}>
                <div style={styles.revealLabel}>💬 QUESTION</div>
                {revealed.question
                  ? <div style={styles.revealText}>{winner.question}</div>
                  : <button style={styles.revealBtn} onClick={() => setRevealed(r => ({ ...r, question: true }))}>
                      Révéler la question
                    </button>
                }
              </div>

              {revealed.defi && revealed.question && (
                <button style={{ ...styles.btn, marginTop: 32 }} onClick={next}>
                  Participant suivant →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#0f0e0c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: 24, position: "relative", overflow: "hidden" },
  grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundSize: "200px", pointerEvents: "none", opacity: 0.5, zIndex: 0 },
  layout: { position: "relative", zIndex: 1, display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 900 },
  wheelWrap: { display: "flex", flexDirection: "column", alignItems: "center" },
  eyebrow: { fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#c8a96e", marginBottom: 12, textTransform: "uppercase" },
  pointer: { color: "#c8a96e", fontSize: 24, lineHeight: 1, marginBottom: -8, zIndex: 2 },
  btn: { background: "#c8a96e", color: "#0f0e0c", border: "none", borderRadius: 2, padding: "12px 28px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", fontWeight: "bold" },
  doneList: { marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 400 },
  doneLabel: { width: "100%", textAlign: "center", color: "#3a3630", fontSize: 10, fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 },
  doneName: { background: "#1a1814", border: "1px solid #2e2b26", borderRadius: 2, padding: "4px 10px", color: "#4a4640", fontSize: 11, fontFamily: "'Courier New', monospace" },
  panel: { background: "#1a1814", border: "1px solid #2e2b26", borderRadius: 2, padding: "40px 36px", width: 320, minHeight: 360, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column" },
  panelEmpty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#3a3630", fontSize: 15, fontFamily: "'Georgia', serif", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" },
  winnerName: { fontFamily: "'Georgia', serif", fontSize: 32, color: "#c8a96e", marginBottom: 28, letterSpacing: "-0.02em" },
  revealBlock: { margin: "12px 0" },
  revealLabel: { fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#4a4640", marginBottom: 10, textTransform: "uppercase" },
  revealText: { color: "#f0ece4", fontSize: 16, lineHeight: 1.6, fontFamily: "'Georgia', serif", fontStyle: "italic" },
  revealBtn: { background: "#0f0e0c", color: "#c8a96e", border: "1px solid #c8a96e44", borderRadius: 2, padding: "10px 16px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer", letterSpacing: "0.05em" },
  divider: { height: 1, background: "#2e2b26", margin: "12px 0" },
  msg: { color: "#8a8278", fontFamily: "'Georgia', serif", fontSize: 18 },
};
