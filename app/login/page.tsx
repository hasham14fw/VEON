'use client';

import {useState, type FormEvent} from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('zohair');
  const [password, setPassword] = useState('veon12345');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          remember,
        }),
      });

      const data = (await res.json()) as {ok?: boolean; error?: string};

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Successful login -> Redirect to workspace
      window.location.href = '/';
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed.');
      setLoading(false);
    }
  }

  function handleFillDemo() {
    setUsername('zohair');
    setPassword('veon12345');
    setError('');
  }

  return (
    <div className="login-viewport">
      {/* Background ambient lighting effects */}
      <div className="login-ambient-glow" />
      <div className="login-grid-overlay" />

      {/* Top microbar */}
      <header className="login-top-tag">
        <span className="live-status-dot" />
        <span className="mono-text">VEON SECURE GATEWAY · GEO-EW COMMAND PROTOCOL v2.4</span>
      </header>

      {/* Main Section in the Middle */}
      <main className="login-center-container">
        <div className="login-card">
          
          {/* LEFT PART: Brand, Logo & Name VEON GEO-EW System (White with border) */}
          <section className="login-left-pane">
            <div className="login-left-content">
              {/* Security Classification Pill */}
              <div className="login-classification-pill">
                <span className="pulse-yellow-dot" />
                <span>RESTRICTED ACCESS · CORPORATE AFFAIRS</span>
              </div>

              {/* Center Brand Group */}
              <div className="login-brand-center">
                <div className="login-logo-wrap">
                  <img
                    src="/brand/veon-logo-yellow.svg"
                    alt="VEON"
                    className="login-veon-logo"
                    width="190"
                    height="88"
                  />
                </div>

                <div className="login-title-group">
                  <h1 className="login-system-title">
                    <span className="title-veon">VEON</span>{' '}
                    <span className="title-highlight">GEO-EW</span>{' '}
                    <span className="title-system">System</span>
                  </h1>
                  <p className="login-system-sub">
                    Geospatial Early-Warning & Geopolitical Risk Intelligence
                  </p>
                </div>
              </div>

              {/* Minimal Brand Seal */}
              <div className="login-left-minimal-seal">
                <span className="seal-dot" />
                <span>Group Intelligence Workspace</span>
              </div>
            </div>
          </section>

          {/* RIGHT PART: Authentication Form */}
          <section className="login-right-pane">
            <div className="login-right-content">
              {/* Header */}
              <div className="login-form-header">
                <div className="login-lock-badge">
                  <Lock size={18} />
                </div>
                <h2>Operator Sign In</h2>
                <p>Enter your authorization credentials to access the early-warning situational picture.</p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="login-error-banner" role="alert">
                  <AlertTriangle size={18} className="error-icon" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="login-form">
                {/* Username Input */}
                <div className="form-field-group">
                  <label htmlFor="login-username">Operator Username</label>
                  <div className="input-wrap">
                    <User size={17} className="field-icon" />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Enter username (e.g. zohair)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="form-field-group">
                  <div className="label-row">
                    <label htmlFor="login-password">Operator Password</label>
                  </div>
                  <div className="input-wrap">
                    <Lock size={17} className="field-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Session Checkbox & Quick Fill */}
                <div className="form-options-row">
                  <label className="remember-checkbox-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={loading}
                    />
                    <span>Remember this device</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="demo-fill-btn"
                    title="Pre-fill default pilot credentials"
                  >
                    <Sparkles size={13} /> Quick Fill
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                >
                  {loading ? (
                    <span className="loading-state">
                      <span className="spinner-icon" />
                      Verifying Credentials…
                    </span>
                  ) : (
                    <span className="btn-content">
                      <span>Authenticate & Enter Workspace</span>
                      <ArrowRight size={17} className="arrow-icon" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          </section>

        </div>
      </main>

      {/* Bottom bar */}
      <footer className="login-bottom-bar">
        <span>© 2026 VEON Ltd. All Rights Reserved.</span>
        <span>Corporate Affairs & Group Security Strategy</span>
      </footer>
    </div>
  );
}
