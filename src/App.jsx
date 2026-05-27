import { useState, useEffect } from "react";

// ── CONFIGURATION ─────────────────────────────────────────────────────────────
// Modifie librement ces listes avant de partager le lien

const DEFIS = [
  "Présente le meilleur mail que tu aies reçu ou envoyé",
  "Présente le pire mail que tu aies reçu ou envoyé",
  "Chante ou fredonne ton état d'esprit sur le site en ce moment",
  "Mime une situation de travail typique sans parler",
  "Explique ton rôle comme si tu parlais à un enfant de 8 ans",
  "Dis ce que tu ferais différemment si tu recommençais depuis le début",
  "Partage une conviction professionnelle que peu de gens partagent",
  "Présente en 60 secondes le projet dont tu es le plus fier·e",
  "Décris ton pire cauchemar professionnel (vécu ou imaginé)",
  "Invente un slogan pour ton équipe",
  "Explique en une phrase ce qui te fait lever le matin",
  "Raconte une anecdote de travail qui te fait encore sourire",
];

const QUESTIONS = [
  "Quelle compétence aimerais-tu développer cette année ?",
  "Qu'est-ce qui te prend le plus d'énergie en ce moment ?",
  "Si tu pouvais changer une chose dans notre façon de travailler, ce serait quoi ?",
  "Quel est ton moment de la journée le plus productif ?",
  "Qu'est-ce que tu fais quand tu es bloqué·e sur un problème ?",
  "Quelle réunion supprimerais-tu en premier si tu le pouvais ?",
  "Qu'est-ce qui te rend fier·e dans ton travail en ce moment ?",
  "Quelle est ta définition personnelle d'un travail bien fait ?",
  "Comment sais-tu quand une décision est bonne ?",
  "Qu'est-ce que tu n'avais pas anticipé en prenant ce poste ?",
  "Quel conseil donnerais-tu à quelqu'un qui débute dans ton rôle ?",
  "Quelle est la chose la plus importante que tu aies apprise cette année ?",
];

const STORAGE_KEY = "tirage-session-v1";
const STORAGE_KEY_DRAWS = "tirage-draws-v1";

// ── HELPERS ───────────────────────────────────────────────────────────────────

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────

export default function Tirage() {
  const [screen, setScreen] = useState("home"); // home | draw | result | admin
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [result, setResult] = useState(null);
  const [draws, setDraws] = useState({});
  const [animating, setAnimating] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [error, setError] = useState("");

  // Charge les tirages partagés au démarrage
  useEffect(() => {
    loadDraws();
    // Vérifie si cet utilisateur a déjà tiré (session locale)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { name: n, result: r } = JSON.parse(saved);
        setName(n);
        setResult(r);
        setScreen("result");
      }
    } catch {}
  }, []);

  async function loadDraws() {
    try {
      const res = await window.storage.get(STORAGE_KEY_DRAWS, true);
      if (res) setDraws(JSON.parse(res.value));
    } catch {
      setDraws({});
    }
  }

  async function saveDraws(newDraws) {
    await window.storage.set(STORAGE_KEY_DRAWS, JSON.stringify(newDraws), true);
    setDraws(newDraws);
  }

  async function handleDraw() {
    setError("");
    const trimmed = nameInput.trim();
    if (!trimmed) { setError("Entre ton prénom d'abord."); return; }

    await loadDraws();
    const fresh = await window.storage.get(STORAGE_KEY_DRAWS, true);
    const currentDraws = fresh ? JSON.parse(fresh.value) : {};

    // Vérifie doublon de prénom
    if (currentDraws[trimmed]) {
      setName(trimmed);
      setResult(currentDraws[trimmed]);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: trimmed, result: currentDraws[trimmed] })); } catch {}
      setScreen("result");
      return;
    }

    // Calcule les items déjà pris
    const usedDefis = Object.values(currentDraws).map(d => d.defi);
    const usedQuestions = Object.values(currentDraws).map(d => d.question);
    const availableDefis = DEFIS.filter(d => !usedDefis.includes(d));
    const availableQuestions = QUESTIONS.filter(q => !usedQuestions.includes(q));

    if (!availableDefis.length || !availableQuestions.length) {
      setError("Tous les tirages ont été effectués !");
      return;
    }

    setAnimating(true);
    await new Promise(r => setTimeout(r, 1400));

    const defi = pickRandom(availableDefis);
    const question = pickRandom(availableQuestions);
    const newResult = { defi, question };

    const updatedDraws = { ...currentDraws, [trimmed]: newResult };
    await saveDraws(updatedDraws);

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: trimmed, result: newResult })); } catch {}

    setName(trimmed);
    setResult(newResult);
    setAnimating(false);
    setScreen("result");
  }

  async function resetAll() {
    await window.storage.set(STORAGE_KEY_DRAWS, JSON.stringify({}), true);
    setDraws({});
  }

  const remaining = (() => {
    const usedD = Object.values(draws).map(d => d.defi);
    const usedQ = Object.values(draws).map(d => d.question);
    return {
      defis: DEFIS.filter(d => !usedD.includes(d)).length,
      questions: QUESTIONS.filter(q => !usedQ.includes(q)).length,
      participants: Object.keys(draws).length,
    };
  })();

  // ── VUES ──────────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      <div style={styles.grain} />

      {screen === "home" && (
        <div style={styles.card}>
          <div style={styles.eyebrow}>TIRAGE AU SORT</div>
          <h1 style={styles.title}>Ta mission<br />t'attend.</h1>
          <p style={styles.sub}>Entre ton prénom pour tirer au sort ton défi et ta question.</p>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              placeholder="Ton prénom"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleDraw()}
              autoFocus
            />
            <button style={styles.btn} onClick={handleDraw} disabled={animating}>
              {animating ? <Spinner /> : "Tirer →"}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.counter}>{remaining.participants} / {DEFIS.length} tirages effectués</div>
          <button style={styles.adminLink} onClick={() => setScreen("admin")}>Vue animateur</button>
        </div>
      )}

      {screen === "result" && result && (
        <div style={styles.card}>
          <div style={styles.eyebrow}>RÉSULTAT DE {name.toUpperCase()}</div>
          <div style={styles.resultBlock}>
            <div style={styles.resultLabel}>🎯 TON DÉFI</div>
            <div style={styles.resultText}>{result.defi}</div>
          </div>
          <div style={styles.divider} />
          <div style={styles.resultBlock}>
            <div style={styles.resultLabel}>💬 TA QUESTION</div>
            <div style={styles.resultText}>{result.question}</div>
          </div>
          <p style={styles.hint}>Garde ça pour toi jusqu'à la réunion ✦</p>
          <button style={styles.btnSecondary} onClick={() => {
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            setNameInput(""); setResult(null); setName(""); setError("");
            setScreen("home");
          }}>← Retour (autre participant)</button>
        </div>
      )}

      {screen === "admin" && (
        <div style={styles.card}>
          <div style={styles.eyebrow}>VUE ANIMATEUR</div>
          {!adminUnlocked ? (
            <>
              <p style={styles.sub}>Code d'accès</p>
              <div style={styles.inputRow}>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Code"
                  value={adminInput}
                  onChange={e => setAdminInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && adminInput === "1234" && setAdminUnlocked(true)}
                />
                <button style={styles.btn} onClick={() => {
                  if (adminInput === "1234") setAdminUnlocked(true);
                  else setError("Code incorrect");
                }}>OK</button>
              </div>
              {error && <div style={styles.error}>{error}</div>}
              <p style={{...styles.hint, marginTop: 12}}>Code par défaut : 1234</p>
            </>
          ) : (
            <>
              <div style={styles.statRow}>
                <Stat label="Participants" value={remaining.participants} />
                <Stat label="Défis restants" value={remaining.defis} />
                <Stat label="Questions restantes" value={remaining.questions} />
              </div>
              <div style={styles.drawList}>
                {Object.entries(draws).length === 0 && <div style={styles.hint}>Aucun tirage encore effectué.</div>}
                {Object.entries(draws).map(([n, r]) => (
                  <div key={n} style={styles.drawItem}>
                    <strong style={styles.drawName}>{n}</strong>
                    <span style={styles.drawDefi}>🎯 {r.defi}</span>
                    <span style={styles.drawQ}>💬 {r.question}</span>
                  </div>
                ))}
              </div>
              <div style={styles.adminActions}>
                <button style={styles.btnDanger} onClick={() => { if(window.confirm("Remettre à zéro tous les tirages ?")) resetAll(); }}>
                  Remettre à zéro
                </button>
                <button style={styles.btnSecondary} onClick={() => loadDraws()}>Rafraîchir</button>
              </div>
            </>
          )}
          <button style={{...styles.adminLink, marginTop: 24}} onClick={() => { setScreen("home"); setAdminUnlocked(false); setAdminInput(""); setError(""); }}>← Retour</button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>;
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0f0e0c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Georgia', serif",
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
    backgroundSize: "200px",
    pointerEvents: "none",
    opacity: 0.5,
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "#1a1814",
    border: "1px solid #2e2b26",
    borderRadius: 2,
    padding: "48px 40px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
  },
  eyebrow: {
    fontFamily: "'Courier New', monospace",
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "#c8a96e",
    marginBottom: 16,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "'Georgia', serif",
    fontSize: 42,
    fontWeight: "normal",
    color: "#f0ece4",
    margin: "0 0 16px",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  sub: {
    color: "#8a8278",
    fontSize: 15,
    lineHeight: 1.6,
    margin: "0 0 28px",
    fontFamily: "'Georgia', serif",
  },
  inputRow: {
    display: "flex",
    gap: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    background: "#0f0e0c",
    border: "1px solid #2e2b26",
    borderRadius: 2,
    padding: "12px 14px",
    color: "#f0ece4",
    fontSize: 15,
    fontFamily: "'Georgia', serif",
    outline: "none",
    transition: "border-color 0.2s",
  },
  btn: {
    background: "#c8a96e",
    color: "#0f0e0c",
    border: "none",
    borderRadius: 2,
    padding: "12px 20px",
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.05em",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
  btnSecondary: {
    background: "transparent",
    color: "#8a8278",
    border: "1px solid #2e2b26",
    borderRadius: 2,
    padding: "10px 16px",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    marginTop: 16,
    display: "block",
  },
  btnDanger: {
    background: "transparent",
    color: "#c0392b",
    border: "1px solid #c0392b44",
    borderRadius: 2,
    padding: "10px 16px",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
  },
  error: {
    color: "#c0392b",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    marginTop: 8,
  },
  counter: {
    color: "#4a4640",
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
    marginTop: 16,
    letterSpacing: "0.05em",
  },
  adminLink: {
    background: "none",
    border: "none",
    color: "#3a3630",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    marginTop: 20,
    display: "block",
    letterSpacing: "0.1em",
    padding: 0,
  },
  resultBlock: {
    margin: "20px 0",
  },
  resultLabel: {
    fontFamily: "'Courier New', monospace",
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "#c8a96e",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  resultText: {
    color: "#f0ece4",
    fontSize: 18,
    lineHeight: 1.5,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    background: "#2e2b26",
    margin: "8px 0",
  },
  hint: {
    color: "#4a4640",
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.05em",
    marginTop: 24,
  },
  statRow: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    background: "#0f0e0c",
    border: "1px solid #2e2b26",
    borderRadius: 2,
    padding: "12px 8px",
    textAlign: "center",
  },
  statValue: {
    color: "#c8a96e",
    fontSize: 28,
    fontFamily: "'Georgia', serif",
  },
  statLabel: {
    color: "#4a4640",
    fontSize: 10,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.1em",
    marginTop: 4,
    textTransform: "uppercase",
  },
  drawList: {
    maxHeight: 280,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  drawItem: {
    background: "#0f0e0c",
    border: "1px solid #2e2b26",
    borderRadius: 2,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  drawName: {
    color: "#c8a96e",
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  drawDefi: {
    color: "#8a8278",
    fontSize: 13,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  drawQ: {
    color: "#6a6460",
    fontSize: 12,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  adminActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
};
