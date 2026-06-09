import { LoginForm } from "./LoginForm";

export function LoginPage() {
  return (
    <div className="login-page login-bg">
      <div className="login-center">
        <div className="login-card">
          <header className="login-brand">
            <span className="hero-greek">Μνήμη · Memory</span>
            <h1>Mneme</h1>
            <p className="tagline">Memory made social.</p>
          </header>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
