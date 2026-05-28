import { useState, useEffect } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://zenerivwdjztmcvxahhn.supabase.co",
  "sb_publishable_UvbD8gSKMZVx0_8zCkz85g_ElkgnyPl"
);

// ── CONFIGURATION ─────────────────────────────────────────────────────────────

const DEFIS = [
"La décision venue "d'en haut" que tu as eu le plus de mal à expliquer à ton équipe",
"La meilleure perle dans les mails reçus",
"La pire boulette de ton équipe",
"La pire situation à gérer de ton équipe",
"La plus belle perle de RIAS",
"La plus grosse déconvenue rencontrée sur ce poste",
"La réponse la plus langue de bois de RIAS",
"Le libellé d'activité le plus original",
"Le mail le plus surprenant que tu aies reçu de la part de ton équipe",
"Le mail le plus drôle reçu par de ton équipe",
"Le message auquel tu as mis 3 jours à répondre parce que tu ne savais pas quoi dire",
"Le moment le plus joyeux sur ce poste",
"Le moment le plus lunaire en réunion",
"Le moment où tu as fait semblant de comprendre quelque chose… alors que pas du tout",
"Le moment où tu as réalisé que tu t'étais trompé(e) de destinataire",
"L'irritant dans ton équipe",
"Mime un moment fort de l'année de ton équipe (les autres vont deviner)",
"Si tu devais rebaptiser ton poste avec un titre vraiment honnête, ce serait quoi ?",
"Tout ce que tu as toujours eu envie de savoir sur RIAS sans jamais oser le demander",
"La demande la plus urgente qui ne l'était finalement pas du tout",
"La boulette que tu as toi-même faite et que tu peux enfin avouer",
"La phrase entendue en réunion que tu n'aurais jamais imaginé entendre dans un contexte professionnel",
"Ce que tu penses vraiment quand tu lis un mail de RIAS",
];

const QUESTIONS = [
 "Le plus gros point fort de ton équipe",
"Le super-pouvoir dont tu aurais besoin pour faire ton travail",
"Le titre de film, série ou livre qui résume le mieux ce que tu attends des GRS",
"L'activité que tu préfères sur ce poste",
"L'ambiance du moment dans ton équipe : en chanson (à fredonner !)",
"Quel serait l'animal totem de ton équipe ? Pourquoi ?",
"Si ton équipe avait une musique d'ambiance diffusée en continu, ce serait laquelle ? (à fredonner!)",
"Si ton équipe était dans une autre ville, où serait-elle ?",
"Si ton équipe était un monument, ce serait ? (et pourquoi)",
"Si ton équipe était un plat cuisiné, ce serait lequel ? (et pourquoi)",
"Si ton équipe avait un cri de guerre, quel serait-il ? (à faire bien sûr !)",
"Si ton équipe était un personnage fictif (film, série, livre…), ce serait qui ?",
"Si ton équipe était une équipe de sport, à quel sport jouerait-elle ? Quel serait ton rôle ?",
"Si tu arrivais à RIAS, quelle serait la première chose que tu ferais ?",
"Si tu avais une seule chose à demander à RIAS, que demanderais-tu ?",
"Si tu devais changer une chose dans ton équipe, que ferais-tu ?",
"Ta plus grande réussite sur ce poste",
"Ton état d'esprit en venant aux GRS : en chanson (à fredonner !)",
"Tu es fier(ère) de ton équipe ! Pourquoi ?",
"Un slogan pour caractériser ton équipe",
"Une chose que les gens de l'extérieur ne savent pas sur ton équipe et qui les surprendrait",
"La compétence cachée dans ton équipe que peu de gens connaissent",
"La phrase que tu n'as jamais dite à ton équipe… mais que tu devrais peut-être dire",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Tirage() {
  const [screen, setScreen] = useState("home");
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [draws, setDraws] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Vérifie session locale
    try {
      const saved = localStorage.getItem("tirage-user");
      if (saved) {
        const { name: n, result: r } = JSON.parse(saved);
        setName(n); setResult(r); setScreen("result");
      }
    } catch {}
  }, []);

  async function loadDraws() {
    const { data } = await supabase.from("draws").select("*");
    setDraws(data || []);
    return data || [];
  }

  async function handleDraw() {
    setError("");
    const trimmed = nameInput.trim();
    if (!trimmed) { setError("Entre ton prénom d'abord."); return; }

    const current = await loadDraws();

    // Doublon de prénom ?
    const existing = current.find(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const r = { defi: existing.defi, question: existing.question };
      setName(trimmed); setResult(r);
      try { localStorage.setItem("tirage-user", JSON.stringify({ name: trimmed, result: r })); } catch {}
      setScreen("result");
      return;
    }

    const usedDefis = current.map(d => d.defi);
    const usedQuestions = current.map(d => d.question);
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

    const { error: err } = await supabase.from("draws").insert({ name: trimmed, defi, question });
    if (err) { setError("Erreur lors du tirage. Réessaie."); setAnimating(false); return; }

    const r = { defi, question };
    try { localStorage.setItem("tirage-user", JSON.stringify({ name: trimmed, result: r })); } catch {}
    setName(trimmed); setResult(r);
    setAnimating(false);
    setScreen("result");
  }

  async function resetAll() {
    await supabase.from("draws").delete().neq("id", 0);
    setDraws([]);
  }

  const remaining = {
    participants: draws.length,
    defis: DEFIS.filter(d => !draws.map(x => x.defi).includes(d)).length,
    questions: QUESTIONS.filter(q => !draws.map(x => x.question).includes(q)).length,
  };

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
              {animating ? "..." : "Tirer →"}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.counter}>{remaining.participants} / {DEFIS.length} tirages effectués</div>
          <button style={styles.adminLink} onClick={() => { loadDraws(); setScreen("admin"); }}>Vue animateur</button>
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
          <div style={styles.finalMsg}>
            <div style={styles.finalMsgTitle}>C'est tout pour toi ✦</div>
            <div style={styles.finalMsgSub}>Note bien ton défi et ta question — tu en auras besoin en réunion. Garde-les secrets jusqu'au jour J.</div>
          </div>
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
              <p style={{ ...styles.hint, marginTop: 12 }}>Code par défaut : 1234</p>
            </>
          ) : (
            <>
              <div style={styles.statRow}>
                <Stat label="Participants" value={remaining.participants} />
                <Stat label="Défis restants" value={remaining.defis} />
                <Stat label="Questions restantes" value={remaining.questions} />
              </div>
              <div style={styles.drawList}>
                {draws.length === 0 && <div style={styles.hint}>Aucun tirage encore effectué.</div>}
                {draws.map((d, i) => (
                  <div key={i} style={styles.drawItem}>
                    <strong style={styles.drawName}>{d.name}</strong>
                    <span style={styles.drawDefi}>🎯 {d.defi}</span>
                    <span style={styles.drawQ}>💬 {d.question}</span>
                  </div>
                ))}
              </div>
              <div style={styles.adminActions}>
                <button style={styles.btnDanger} onClick={() => { if (window.confirm("Remettre à zéro ?")) resetAll(); }}>
                  Remettre à zéro
                </button>
                <button style={styles.btnSecondary} onClick={loadDraws}>Rafraîchir</button>
              </div>
            </>
          )}
          <button style={{ ...styles.adminLink, marginTop: 24 }} onClick={() => {
            setScreen("home"); setAdminUnlocked(false); setAdminInput(""); setError("");
          }}>← Retour</button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#0f0e0c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: 24, position: "relative", overflow: "hidden" },
  grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundSize: "200px", pointerEvents: "none", opacity: 0.5, zIndex: 0 },
  card: { position: "relative", zIndex: 1, background: "#1a1814", border: "1px solid #2e2b26", borderRadius: 2, padding: "48px 40px", maxWidth: 520, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" },
  eyebrow: { fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#c8a96e", marginBottom: 16, textTransform: "uppercase" },
  title: { fontFamily: "'Georgia', serif", fontSize: 42, fontWeight: "normal", color: "#f0ece4", margin: "0 0 16px", lineHeight: 1.15, letterSpacing: "-0.02em" },
  sub: { color: "#8a8278", fontSize: 15, lineHeight: 1.6, margin: "0 0 28px", fontFamily: "'Georgia', serif" },
  inputRow: { display: "flex", gap: 10, marginBottom: 8 },
  input: { flex: 1, background: "#0f0e0c", border: "1px solid #2e2b26", borderRadius: 2, padding: "12px 14px", color: "#f0ece4", fontSize: 15, fontFamily: "'Georgia', serif", outline: "none" },
  btn: { background: "#c8a96e", color: "#0f0e0c", border: "none", borderRadius: 2, padding: "12px 20px", fontSize: 14, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" },
  btnSecondary: { background: "transparent", color: "#8a8278", border: "1px solid #2e2b26", borderRadius: 2, padding: "10px 16px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer", marginTop: 16, display: "block" },
  btnDanger: { background: "transparent", color: "#c0392b", border: "1px solid #c0392b44", borderRadius: 2, padding: "10px 16px", fontSize: 13, fontFamily: "'Courier New', monospace", cursor: "pointer" },
  error: { color: "#c0392b", fontSize: 13, fontFamily: "'Courier New', monospace", marginTop: 8 },
  counter: { color: "#4a4640", fontSize: 12, fontFamily: "'Courier New', monospace", marginTop: 16, letterSpacing: "0.05em" },
  adminLink: { background: "none", border: "none", color: "#3a3630", fontSize: 11, fontFamily: "'Courier New', monospace", cursor: "pointer", marginTop: 20, display: "block", letterSpacing: "0.1em", padding: 0 },
  resultBlock: { margin: "20px 0" },
  resultLabel: { fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#c8a96e", marginBottom: 10, textTransform: "uppercase" },
  resultText: { color: "#f0ece4", fontSize: 18, lineHeight: 1.5, fontFamily: "'Georgia', serif", fontStyle: "italic" },
  divider: { height: 1, background: "#2e2b26", margin: "8px 0" },
  hint: { color: "#4a4640", fontSize: 12, fontFamily: "'Courier New', monospace", letterSpacing: "0.05em", marginTop: 24 },
  statRow: { display: "flex", gap: 16, marginBottom: 24 },
  stat: { flex: 1, background: "#0f0e0c", border: "1px solid #2e2b26", borderRadius: 2, padding: "12px 8px", textAlign: "center" },
  statValue: { color: "#c8a96e", fontSize: 28, fontFamily: "'Georgia', serif" },
  statLabel: { color: "#4a4640", fontSize: 10, fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", marginTop: 4, textTransform: "uppercase" },
  drawList: { maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 },
  drawItem: { background: "#0f0e0c", border: "1px solid #2e2b26", borderRadius: 2, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 },
  drawName: { color: "#c8a96e", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" },
  drawDefi: { color: "#8a8278", fontSize: 13, fontFamily: "'Georgia', serif", fontStyle: "italic" },
  drawQ: { color: "#6a6460", fontSize: 12, fontFamily: "'Georgia', serif", fontStyle: "italic" },
  adminActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  finalMsg: { marginTop: 28, padding: "20px 16px", background: "#0f0e0c", border: "1px solid #2e2b26", borderRadius: 2 },
  finalMsgTitle: { fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: "0.15em", color: "#c8a96e", textTransform: "uppercase", marginBottom: 10 },
  finalMsgSub: { color: "#6a6460", fontSize: 13, fontFamily: "'Georgia', serif", fontStyle: "italic", lineHeight: 1.7 },
};
