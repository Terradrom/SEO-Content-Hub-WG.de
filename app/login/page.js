"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";

const ERROR_DE = {
  "Invalid login credentials": "E-Mail oder Passwort ist falsch.",
  "Email not confirmed": "Diese E-Mail-Adresse ist noch nicht bestätigt.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(ERROR_DE[error.message] || error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="wrap" style={{ maxWidth: 400, marginTop: "12vh" }}>
      <div className="login-card">
        <img className="brand-logo" src="/logo.png" alt="Werbegeschenk.de" />
        <h1>SEO Content Hub</h1>
        <p className="hint" style={{ marginBottom: 22 }}>
          Melde dich mit deinem Team-Konto an.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="name@beispiel.de" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div>}
          <button className="save-note-btn" type="submit" disabled={loading}>
            {loading ? "Anmeldung läuft…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
