import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  FileCode2,
  HardDriveDownload,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Radio,
  Save,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { DEFAULT_MMDVM_CONFIG } from './data/presets';
import { ConfigTab, MmdvmConfiguration, WorkspaceView } from './types/mmdvmConfig';
import { validateMmdvmConfig } from './utils/validation';
import { useLocalNode } from './hooks/useLocalNode';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ConfiguratorView } from './components/ConfiguratorView';
import { InstallerView } from './components/InstallerView';
import { ConfigFilesView } from './components/ConfigFilesView';

function deepMergeConfig(saved: Partial<MmdvmConfiguration>): MmdvmConfiguration {
  return {
    station: { ...DEFAULT_MMDVM_CONFIG.station, ...(saved.station || {}) },
    modem: { ...DEFAULT_MMDVM_CONFIG.modem, ...(saved.modem || {}) },
    networks: { ...DEFAULT_MMDVM_CONFIG.networks, ...(saved.networks || {}) },
    allstar: {
      ...DEFAULT_MMDVM_CONFIG.allstar,
      ...(saved.allstar || {}),
      additionalNodes: Array.isArray(saved.allstar?.additionalNodes)
        ? saved.allstar.additionalNodes
        : DEFAULT_MMDVM_CONFIG.allstar.additionalNodes,
    },
    dvswitch: { ...DEFAULT_MMDVM_CONFIG.dvswitch, ...(saved.dvswitch || {}) },
    system: { ...DEFAULT_MMDVM_CONFIG.system, ...(saved.system || {}) },
  };
}

const NAV_ITEMS: {
  id: WorkspaceView;
  label: string;
  icon: typeof Activity;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'configurator', label: 'Configurator', icon: SlidersHorizontal },
  { id: 'installer', label: 'Installer', icon: HardDriveDownload },
  { id: 'files', label: 'Config Files', icon: FileCode2 },
];

const VIEW_TITLES: Record<WorkspaceView, string> = {
  dashboard: 'Dashboard',
  configurator: 'Configurator',
  installer: 'Installer',
  files: 'Config Files',
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('mmdvm_webgui_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [config, setConfig] = useState<MmdvmConfiguration>(DEFAULT_MMDVM_CONFIG);
  const [view, setView] = useState<WorkspaceView>('configurator');
  const [configTab, setConfigTab] = useState<ConfigTab>('station');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [didAutoRoute, setDidAutoRoute] = useState(false);

  const handleSavedConfigLoaded = useCallback((saved: MmdvmConfiguration) => {
    setConfig(deepMergeConfig(saved));
  }, []);

  const localNode = useLocalNode(handleSavedConfigLoaded);
  const anyInstalled =
    localNode.installed.mmdvmhost || localNode.installed.asterisk || localNode.installed.dvswitch;

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('mmdvm_webgui_theme', darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    if (!localNode.authenticated) {
      setDidAutoRoute(false);
      return;
    }
    if (!didAutoRoute && (anyInstalled || !localNode.hostAvailable)) {
      setView(anyInstalled ? 'dashboard' : 'configurator');
      setDidAutoRoute(true);
    }
  }, [localNode.authenticated, anyInstalled, localNode.hostAvailable, didAutoRoute]);

  const issues = useMemo(
    () =>
      validateMmdvmConfig(
        config,
        localNode.hostAvailable ? localNode.detectedSerialPorts : undefined
      ),
    [config, localNode.hostAvailable, localNode.detectedSerialPorts]
  );

  const hasErrors = issues.some((i) => i.severity === 'error');

  const hasUnsavedChanges = useMemo(() => {
    if (!localNode.savedConfig) return false;
    const baseline = deepMergeConfig(localNode.savedConfig);
    return JSON.stringify(config) !== JSON.stringify(baseline);
  }, [config, localNode.savedConfig]);

  const handleNavigate = useCallback((nextView: WorkspaceView, nextTab?: ConfigTab) => {
    setView(nextView);
    if (nextTab) setConfigTab(nextTab);
    setMobileMenuOpen(false);
  }, []);

  const handleApplyConfig = useCallback(async () => {
    if (hasErrors) return;
    const started = await localNode.applyConfigOnly(config);
    if (started) {
      setView('installer');
    }
  }, [config, hasErrors, localNode]);

  const handleStartInstall = useCallback(async () => {
    if (hasErrors) return;
    await localNode.startInstall(config);
  }, [config, hasErrors, localNode]);

  if (localNode.checking) {
    return (
      <div className="min-h-screen bg-blue-100 dark:bg-[#08172e] flex items-center justify-center p-6 text-slate-700 dark:text-blue-200">
        <div className="flex items-center gap-2.5 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-sky-400" />
          <span>Connecting to Node Control...</span>
        </div>
      </div>
    );
  }

  if (!localNode.authenticated) {
    return (
      <LoginView
        localNode={localNode}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  const isRunningJob = localNode.job.status === 'running';

  return (
    <div className="min-h-screen bg-blue-100 dark:bg-[#08172e] text-slate-900 dark:text-blue-50 flex">
      {/* Desktop Deep-Blue Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#0b2345] dark:bg-[#061224] text-blue-50 border-r border-blue-900/80">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-blue-800/80">
          <Radio className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
            Node Control
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200/85 hover:bg-blue-900/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800/80 space-y-2 text-xs text-blue-200/80">
          <div className="font-mono truncate text-white">
            {config.station.callsign} · {localNode.hostname}
          </div>
          <div className="flex items-center justify-between">
            <span>Signed in: {localNode.username}</span>
            <button
              type="button"
              onClick={() => localNode.logout()}
              className="text-blue-200 hover:text-white font-medium inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#040c1a]/70"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64 max-w-[80vw] bg-[#0b2345] dark:bg-[#061224] text-blue-50 border-r border-blue-900 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-blue-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400" />
                <span className="font-display text-sm font-bold text-white">Node Control</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-blue-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-200 hover:bg-blue-900/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-blue-800/80">
              <button
                type="button"
                onClick={() => localNode.logout()}
                className="w-full min-h-[40px] px-3 py-2 rounded-md border border-blue-700 text-xs font-medium text-blue-100 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({localNode.username})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb Left / Primary Action Right */}
        <header className="h-16 bg-blue-50/90 dark:bg-[#0b1f3b] border-b border-blue-200 dark:border-blue-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-md text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-blue-800/80 dark:text-blue-300/80 whitespace-nowrap">Node Control</span>
              <span className="text-blue-300 dark:text-blue-700" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {VIEW_TITLES[view]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-[#0d2240] text-slate-700 dark:text-blue-200 hover:bg-blue-100/60 dark:hover:bg-blue-900/50"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {anyInstalled ? (
              <button
                type="button"
                disabled={hasErrors || isRunningJob}
                onClick={handleApplyConfig}
                className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {isRunningJob ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Apply Config</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavigate('installer')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Install Stack
              </button>
            )}
          </div>
        </header>

        {/* Active Job Progress Strip */}
        {isRunningJob && view !== 'installer' && (
          <div className="bg-blue-700 text-white px-4 sm:px-6 lg:px-8 py-2 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate font-medium">
                {localNode.job.step || 'Running background task...'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('installer')}
              className="underline font-semibold whitespace-nowrap shrink-0"
            >
              View Live Logs
            </button>
          </div>
        )}

        {/* Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {view === 'dashboard' && (
            <DashboardView
              config={config}
              hasUnsavedChanges={hasUnsavedChanges}
              hasErrors={hasErrors}
              localNode={localNode}
              onApplyConfig={handleApplyConfig}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'configurator' && (
            <ConfiguratorView
              config={config}
              activeTab={configTab}
              issues={issues}
              hasUnsavedChanges={hasUnsavedChanges}
              localNode={localNode}
              onChange={setConfig}
              onTabChange={setConfigTab}
              onApplyConfig={handleApplyConfig}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'installer' && (
            <InstallerView
              config={config}
              issues={issues}
              localNode={localNode}
              onStartInstall={handleStartInstall}
              onApplyConfig={handleApplyConfig}
              onNavigate={handleNavigate}
            />
          )}

          {view === 'files' && <ConfigFilesView config={config} />}
        </main>
      </div>
    </div>
  );
}
