import { useState } from "react";
import { requestMagicLink } from "../lib/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevLink(null);

    try {
      const result = await requestMagicLink(email);
      setSent(true);
      if (result.dev_magic_link) {
        setDevLink(result.dev_magic_link);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="auth-heading">Sign in</h2>
      <p className="auth-hint">
        Enter your email — we&apos;ll send a magic link
        <span className="auth-hint-dev"> (dev: link shown below)</span>.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      {sent && !error && (
        <p className="auth-success">
          Check your email for a sign-in link.
          {devLink && " In development, use the link below."}
        </p>
      )}

      {devLink && (
        <p className="dev-link">
          <a href={devLink}>Click to sign in (dev magic link)</a>
        </p>
      )}
    </>
  );
}
