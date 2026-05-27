import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialisation de Supabase
const supabaseUrl = "https://zenerivwdjztmcvxahhn.supabase.co";
const supabaseKey = "sb_publishable_UvbD8gSKMZVx0_8zCkz85g_ElkgnyPl";
const supabase = createClient(supabaseUrl, supabaseKey);

// Noms des tables ou buckets Supabase (à adapter selon ta configuration)
const STORAGE_TABLE = "tirage_draws"; // Table pour stocker les tirages
const SESSION_KEY = "tirage-session-v1"; // Clé pour le localStorage (session locale)

// ── CONFIGURATION ─────────────────────────────────────────────────────────────
const DEFIS = [
  "Présente le meilleur mail que tu aies reçu ou envoyé",
  "Présente le pire mail que tu aies reçu ou envoyé",
  // ... (le reste de tes listes DEFIS et QUESTIONS)
];

const QUESTIONS = [
  "Quelle compétence aimerais-tu développer cette année ?",
  // ... (le reste de tes listes)
];

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
  const [screen, setScreen] = useState("home");
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [result, setResult] = useState(null);
  const [draws, setDraws] = useState({});
  const [animating, setAnimating] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [error, setError] = useState("");

  // Charge les tirages depuis Supabase au démarrage
  useEffect(() => {
    loadDraws();
    // Vérifie si cet utilisateur a déjà tiré (session locale)
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const { name: n, result: r } = JSON.parse(saved);
        setName(n);
        setResult(r);
        setScreen("result");
      }
    } catch {}
  }, []);

  // Charge les tirages depuis Supabase
  async function loadDraws() {
    try {
      const { data, error } = await supabase
        .from(STORAGE_TABLE)
        .select("*")
        .eq("session_id", "default"); // ou un identifiant de session si besoin

      if (error) throw error;
      if (data && data.length > 0) {
        setDraws(data[0].draws || {});
      } else {
        setDraws({});
      }
    } catch {
      setDraws({});
    }
  }

  // Sauvegarde les tirages dans Supabase
  async function saveDraws(newDraws) {
    try {
      const { error } = await supabase
        .from(STORAGE_TABLE)
        .upsert({
          session_id: "default", // ou un identifiant unique
          draws: newDraws,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setDraws(newDraws);
    } catch {
      setError("Erreur lors de la sauvegarde des tirages.");
    }
  }

  async function handleDraw() {
    setError("");
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Entre ton prénom d'abord.");
      return;
    }

    await loadDraws();
    const currentDraws = draws;

    // Vérifie doublon de prénom
    if (currentDraws[trimmed]) {
      setName(trimmed);
      setResult(currentDraws[trimmed]);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ name: trimmed, result: currentDraws[trimmed] }));
      } catch {}
      setScreen("result");
      return;
    }

    // Calcule les items déjà pris
    const usedDefis = Object.values(currentDraws).map((d) => d.defi);
    const usedQuestions = Object.values(currentDraws).map((d) => d.question);
    const availableDefis = DEFIS.filter((d) => !usedDefis.includes(d));
    const availableQuestions = QUESTIONS.filter((q) => !usedQuestions.includes(q));

    if (!availableDefis.length || !availableQuestions.length) {
      setError("Tous les tirages ont été effectués !");
      return;
    }

    setAnimating(true);
    await new Promise((r) => setTimeout(r, 1400));

    const defi = pickRandom(availableDefis);
    const question = pickRandom(availableQuestions);
    const newResult = { defi, question };

    const updatedDraws = { ...currentDraws, [trimmed]: newResult };
    await saveDraws(updatedDraws);

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name: trimmed, result: newResult }));
    } catch {}

    setName(trimmed);
    setResult(newResult);
    setAnimating(false);
    setScreen("result");
  }

  async function resetAll() {
    await saveDraws({});
    setDraws({});
  }

  const remaining = (() => {
    const usedD = Object.values(draws).map((d) => d.defi);
    const usedQ = Object.values(draws).map((d) => d.question);
    return {
      defis: DEFIS.filter((d) => !usedD.includes(d)).length,
      questions: QUESTIONS.filter((q) => !usedQ.includes(q)).length,
      participants: Object.keys(draws).length,
    };
  })();

  // ── VUES (inchangé) ────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Le reste de ton JSX reste identique */}
      {/* ... */}
    </div>
  );
}

// ── STYLES (inchangé) ────────────────────────────────────────────────────────
const styles = {
  // ... (tes styles existants)
};
