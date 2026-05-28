import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://zenerivwdjztmcvxahhn.supabase.co",
  "sb_publishable_UvbD8gSKMZVx0_8zCkz85g_ElkgnyPl"
);

export default function SlotMachine() {
  const [participants, setParticipants] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [done, setDone] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [displayed, setDisplayed] = useState("?");
  const [winner, setWinner] = useState(null);
  const [revealed, setRevealed] = useState({ defi: false, question: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => { loadParticipants(); }, []);

  async function loadParticipants() {
    setLoading(true);
    const { data, error } = await supabase.from("draws").select("*");
    if (error || !data) { setError("Impossible de charger les participants."); setLoading(false); return; }
    setParticipants(data);
    setRemaining(data);
    setDisplayed(data.length > 0 ? data[0].name : "?");
    setLoading(false);
  }

  function draw() {
    if (spinning || remaining.length === 0) return;
    setWinner(null);
    setRevealed({ defi: false, question: false });
    setSpinning(true);

    const snap = [...remaining];
    const winnerIndex = Math.floor(Math.random() * snap.length);
    const totalDuration = 3000;
    const start = Date.now();

    // Défilement rapide puis ralentissement
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / totalDuration, 1);

      if (progress < 1) {
        // Intervalle qui grandit pour simuler le ralentissement
        const delay = 50 + Math.pow(progress, 2) * 400;
        const randomName = snap[Math.floor(Math.random() * snap.length)].name;
        setDisplayed(randomName);
        intervalRef.current = setTimeout(tick, delay);
      } else {
        setDisplayed(snap[winnerIndex].name);
        setWinner(snap[winnerIndex]);
        setSpinning(false);
      }
    }
    tick();
  }

  function next() {
    if (!winner) return;
    const newRemaining = remaining.filter(p => p.name !== winner.name);
    setDone(prev => [...prev, winner]);
    setRemaining(newRemaining);
    setWinner(null);
    setRevealed({ defi: false, question: false });
    setDisplayed(newRemaining.length > 0 ? newRemaining[0].name : "—");
  }

  if (loading) return <div style={s.root}><div style={s.msg}>Chargement…</div></div>;
  if (error) return <div style={s.root}><div style={s.msg}>{error}</div></div>;
  if (participants.length === 0) return <div style={s.root}><div style={s.msg}>Aucun tirage trouvé.</div></div>;

  const n = remaining.length;

  return (
    <div style={s.root}>
      <div style={s.grain} />
      <div style={s.layout}>

        {/* SLOT */}
        <div style={s.leftCol}>
          <div style={s.eyebrow}>RÉVÉLATION EN RÉUNION</div>
          <h1 style={s.title}>Qui passe<br />maintenant ?</h1>

          <div style={s.slotWrap}>
            <div style={s.slotScreen}>
              <div style={{
                ...s.slotName,
                animation: spinning ? "flicker 0.1s infinite" : "none",
                color: winner ? "#c8a96e" : spinning ? "#f0ece4" : "#8a8278",
              }}>
                {displayed}
              </div>
            </div>
            <div style={s.slotShadowTop} />
            <div style={s.slotShadowBot} />
          </div>

          <button
            style={{ ...s.btn, opacity: (spinning || n === 0) ? 0.4 : 1, marginTop: 24 }}
            onClick={draw}
            disabled={spinning || n === 0}
          >
            {spinning ? "…" : n === 0 ? "Tous passés ✦" : "Tirer au sort →"}
          </button>

          <div style={s.counter}>{done.length} / {participants.length} participants passés</div>

          {done.length > 0 && (
            <div style={s.doneList}>
              <div style={s.doneLabel}>Déjà passés</div>
              <div style={s.doneNames}>
                {done.map(d => <span key={d.name} style={s.doneName}>{d.name}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* PANNEAU */}
        <div style={s.panel}>
          {!winner ? (
            <div style={s.panelEmpty}>
              {n > 0
                ? <span>Lance le tirage pour<br />désigner un participant.</span>
                : <span>Tous les participants<br />sont passés ✦</span>
              }
            </div>
          ) : (
            <>
              <div style={s.winnerName}>{winner.name}</div>

              <div style={s.revealBlock}>
                <div style={s.revealLabel}>🎯 DÉFI</div>
                {revealed.defi
                  ? <div style={s.revealText}>{winner.defi}</div>
                  : <button style={s.revealBtn} onClick={() => setRevealed(r => ({ ...r, defi: true }))}>
                      Révéler le défi
                    </button>
                }
              </div>

              <div style={s.divider} />

              <div style={s.revealBlock}>
                <div style={s.revealLabel}>💬 QUESTION</div>
                {revealed.question
                  ? <div style={s.revealText}>{winner.question}</div>
                  : <button style={s.revealBtn} onClick={() => setRevealed(r => ({ ...r, question: true }))}>
                      Révéler la question
                    </button>
                }
              </div>

              {revealed.defi && revealed.question && (
                <button style={{ ...s.btn, marginTop: 32 }} onClick={next}>
                  Participant suivant →
                </button>
              )}
            </>
          )}
        </div>

      </div>

      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#0f0e0c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: 24, position: "relative", overflow: "hidden" },
  grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundSize: "200px", pointerEvents: "none", opacity: 0.5, zIndex: 0 },
  layout: { position: "relative", zIndex: 1, display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 900 },
  leftCol: { display: "flex", flexDirection: "column", alignItems: "flex-start", width: 360 },
  eyebrow: { fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#c8a96e", marginBottom: 16, textTransform: "uppercase" },
  title: { fontFamily: "'Georgia', serif", fontSize: 36, fontWeight: "normal", color: "#f0ece4", margin: "0 0 32px", lineHeight: 1.2, letterSpacing: "-0.02em" },
  slotWrap: { position: "relative", width: "100%" },
  slotScreen: { background: "#0f0e0c", border: "2px solid #2e2b26", borderRadius: 2, padding: "28px 24px", textAlign: "center", overflow: "hidden", position: "relative" },
  slotShadowTop: { position: "absolute", top: 0, left: 0, right: 0, height: 32, background: "linear-gradient(to bottom, #0f0e0c, transparent)", pointerEvents: "none", zIndex: 1 },
  slotShadowBot: { position: "absolute", bottom: 0, left: 0, right: 0, height: 32, background: "linear-gradient(to top, #0f0e0c, transparent)", pointerEvents: "none", zIndex: 1 },
  slotName: { fontSize: 38, fontFamily: "'Georgia', serif", letterSpacing: "-0.02em", transition: "color 0.2s", minHeight: 48 },
  btn: { background: "#c8a96e", color: "#0f0e0c", border: "none", borderRadius: 2, padding: "12px 28px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", fontWeight: "bold" },
  counter: { color: "#3a3630", fontSize: 11, fontFamily: "'Courier New', monospace", marginTop: 16, letterSpacing: "0.05em" },
  doneList: { marginTop: 20, width: "100%" },
  doneLabel: { color: "#3a3630", fontSize: 10, fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 },
  doneNames: { display: "flex", flexWrap: "wrap", gap: 6 },
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
