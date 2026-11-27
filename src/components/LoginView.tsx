import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Moon, Radio, ShieldCheck, Sun } from 'lucide-react';
import { LocalNodeController } from '../hooks/useLocalNode';

interface LoginViewProps {
  localNode: LocalNodeController;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function LoginView({ localNode, darkMode, onToggleDark }: LoginViewProps) {
  const isFirstRunSetup = !localNode.authConfigured;
  const [username, setUsername] = useState(localNode.usernameHint || 'admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (isFirstRunSetup) {
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())) {
        setLocalError('Username must be 3–32 characters (letters, numbers, dot, underscore, hyphen).');
        return;
      }
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      await localNode.setupAdmin(username.trim(), password);
      return;
    }

    if (!password) {
      setLocalError('Enter your administrator password.');
      return;
    }
    await localNode.login(username.trim(), password);
  };

  const errorMessage = localError || localNode.authError;

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-[#08172e] text-slate-900 dark:text-blue-50 grid lg:grid-cols-12">
      {/* Left Architectural Deep Blue Brand & Capabilities Panel */}
      <aside className="lg:col-span-5 bg-[#0b2345] text-blue-50 px-8 py-10 lg:px-12 lg:py-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-blue-900/80">
        <div className="space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
              <span className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap">
                Node Control
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-md border border-blue-700/80 text-blue-200 hover:text-white hover:border-sky-400 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              AllStarLink 3, DVSwitch &amp; MMDVM Installer
            </h1>
            <p className="text-sm text-blue-100/85 leading-relaxed max-w-md">
              Configure AllStarLink 3 nodes, DVSwitch transcoding bridges, and MMDVM digital voice modems on separate tabs before installation—then apply configuration edits anytime without reinstalling.
            </p>
          </div>

          <div className="pt-6 border-t border-blue-800/80 space-y-5">
            <div>
              <p className="text-xs font-semibold text-sky-300">01. Separate MMDVM, AllStarLink &amp; DVSwitch Tabs</p>
              <p className="text-sm text-blue-100/80 mt-1">
                Configure 13 MMDVM modem presets, AllStarLink nodes &amp; SimpleUSB FOBs, and DVSwitch USRP/DMR bridges cleanly in their own sections.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-300">02. Automated 6-Step Stack Build</p>
              <p className="text-sm text-blue-100/80 mt-1">
                Installs official AllStarLink 3 and DVSwitch packages on Debian 12/13 and compiles upstream g4klx/MMDVMHost and DMRGateway.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-300">03. Post-Install Config Apply Without Reinstalling</p>
              <p className="text-sm text-blue-100/80 mt-1">
                Write updated settings directly to /etc/asterisk/*.conf, /opt/*_Bridge/*.ini, and /etc/mmdvm/*.ini with automatic backups and instant service reload.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-blue-800/80 flex items-center justify-between text-xs text-blue-300/80 font-mono tabular-nums">
          <span>Host: {localNode.hostname}</span>
          <span>{localNode.hostAvailable ? 'Local Node Mode' : 'Preview Mode'}</span>
        </div>
      </aside>

      {/* Right Authentication Form Panel */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-800 dark:text-blue-300">
              {isFirstRunSetup ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-sky-400" aria-hidden="true" />
                  <span>Initial Administrator Setup</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-blue-600 dark:text-sky-400" aria-hidden="true" />
                  <span>Operator Authentication</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isFirstRunSetup ? 'Create Admin Login' : 'Sign in to Node Control'}
            </h2>
            <p className="text-sm text-slate-700 dark:text-blue-200/80">
              {isFirstRunSetup
                ? 'Set the administrator username and password to protect installation, configuration writes, and service controls on this host.'
                : 'Enter your administrator credentials to manage AllStarLink 3, DVSwitch, MMDVMHost, and configuration files.'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/80 rounded-lg p-6 space-y-5 shadow-xs"
          >
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-md border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 text-xs text-red-700 dark:text-red-300"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-slate-800 dark:text-blue-100"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full min-h-[42px] px-3 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-800 dark:text-blue-100"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isFirstRunSetup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isFirstRunSetup ? 'Minimum 8 characters' : 'Enter password'}
                  required
                  className="w-full min-h-[42px] pl-3 pr-10 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-blue-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isFirstRunSetup && (
              <div className="space-y-1.5">
                <label
                  htmlFor="login-confirm"
                  className="block text-sm font-medium text-slate-800 dark:text-blue-100"
                >
                  Confirm Password
                </label>
                <input
                  id="login-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full min-h-[42px] px-3 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={localNode.authBusy}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {localNode.authBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isFirstRunSetup ? 'Create Admin Account & Sign In' : 'Sign In'}</span>
            </button>
          </form>

          <p className="text-xs text-slate-600 dark:text-blue-300/80 leading-relaxed">
            {localNode.hostAvailable
              ? localNode.envManaged
                ? 'Administrator login is configured via the server environment variable.'
                : 'Credentials are stored as a salted scrypt hash in /etc/mmdvm-webgui/admin.json (0600). Sessions stay in memory only.'
              : 'Preview Mode: Create a temporary local session password to explore the pre-install configurator, installer, and live dashboard.'}
          </p>
        </div>
      </main>
    </div>
  );
}
