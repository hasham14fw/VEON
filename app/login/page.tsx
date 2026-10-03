'use client';

import {useState, type FormEvent} from 'react';
import {
  Lock,
  User,
  AlertTriangle,
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

  function handleFillDemo(account: 'hike' | 'zohair' = 'hike') {
    if (account === 'hike') {
      setUsername('hike');
      setPassword('hike123');
    } else {
      setUsername('zohair');
      setPassword('veon12345');
    }
    setError('');
  }

  return (
    <div className="login-viewport-modern">
      {/* Centered Modern Card */}
      <div className="login-card-modern">
        {/* Exact Geometric SVG Backdrop with Circles and Organic Turns in VEON Black & Yellow */}
        <svg
          className="login-card-backdrop-svg"
          viewBox="0 0 860 500"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Base obsidian black gradient */}
            <linearGradient id="blackBase" x1="0%" y1="0%" x2="65%" y2="100%">
              <stop offset="0%" stopColor="#1E232E" />
              <stop offset="45%" stopColor="#0D1017" />
              <stop offset="100%" stopColor="#05070B" />
            </linearGradient>

            {/* Center Floating 3D VEON Gold/Yellow Sphere */}
            <radialGradient id="sphereGradCenter" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFF4B8" />
              <stop offset="35%" stopColor="#FFC836" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>

            {/* Bottom Left 3D Amber Sphere */}
            <radialGradient id="sphereGradLeft" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#451A03" />
            </radialGradient>

            {/* Bottom Right Corner Yellow Sphere (peeking in) */}
            <radialGradient id="sphereGradRight" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="50%" stopColor="#FFA000" />
              <stop offset="100%" stopColor="#663300" />
            </radialGradient>

            {/* Realistic soft golden drop shadow for center floating sphere */}
            <filter id="centerSphereShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="8" dy="16" stdDeviation="15" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Organic black wave with sweeping circular turn across top and middle */}
          <path
            d="M 0 0 
               L 410 0 
               C 460 70, 460 195, 405 280 
               C 355 355, 275 425, 215 500 
               L 0 500 
               Z"
            fill="url(#blackBase)"
          />

          {/* Sphere 2: Bottom-Left (partially off-screen) */}
          <circle cx="85" cy="460" r="95" fill="url(#sphereGradLeft)" />

          {/* Sphere 1: Center Floating Sphere (overlaps organically into the white section with shadow) */}
          <circle
            cx="330"
            cy="325"
            r="78"
            fill="url(#sphereGradCenter)"
            filter="url(#centerSphereShadow)"
          />

          {/* Sphere 3: Bottom-Right Corner (peeking into the white section) */}
          <circle
            cx="805"
            cy="465"
            r="68"
            fill="url(#sphereGradRight)"
          />
        </svg>

        {/* LEFT BRANDING CONTENT OVERLAY */}
        <section className="login-left-pane-modern">
          <div className="login-left-content-modern">
            <div className="login-brand-top">
              <img
                src="/brand/veon-logo-yellow.svg"
                alt="VEON"
                className="login-veon-logo-modern"
                width="125"
                height="56"
              />
            </div>

            <div className="login-headline-group">
              <h1 className="login-welcome-title">WELCOME</h1>
              <h2 className="login-headline-title">HORIZON 1440 · GEO-EW</h2>
              <p className="login-welcome-desc">
                Unified geopolitical risk surveillance, sovereign airspace integrity, and early-warning intelligence command across VEON operations.
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT WHITE FORM SECTION */}
        <section className="login-right-pane-modern">
          <div className="login-right-content-modern">
            <div className="login-form-header-modern">
              <h2>Sign in</h2>
              <p>Enter your authorization credentials to access HORIZON 1440</p>
            </div>

            {error && (
              <div className="login-error-pill" role="alert">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form-modern">
              {/* User Name Field */}
              <div className="input-field-modern">
                <User size={18} className="field-icon-modern" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="User Name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="input-field-modern">
                <Lock size={18} className="field-icon-modern" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="show-toggle-modern"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              {/* Remember me & Quick Fill Options */}
              <div className="options-row-modern">
                <label className="remember-label-modern">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={loading}
                  />
                  <span>12h Session</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('hike')}
                    className="forgot-link-modern"
                    title="Fill hike / hike123"
                  >
                    hike
                  </button>
                  <span className="text-slate-400">·</span>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('zohair')}
                    className="forgot-link-modern"
                    title="Fill zohair / veon12345"
                  >
                    zohair
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="primary-signin-btn"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3 font-medium">
                Protected Session · Automated logout after 12 hours
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
