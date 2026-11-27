import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Play,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { ConfigTab, MmdvmConfiguration, ValidationIssue, WorkspaceView } from '../types/mmdvmConfig';
import { generateInstallScript, getFullDmrId } from '../utils/generators';
import { downloadTextFile } from '../utils/download';
import { LocalNodeController } from '../hooks/useLocalNode';

interface InstallerViewProps {
  config: MmdvmConfiguration;
  issues: ValidationIssue[];
  localNode: LocalNodeController;
  onStartInstall: () => Promise<void>;
  onApplyConfig: () => Promise<void>;
  onNavigate: (view: WorkspaceView, tab?: ConfigTab) => void;
}

const INSTALL_STEPS = [
  {
    index: 1,
    title: 'System Dependencies & Host Setup',
    detail: 'Updates apt, installs build tools & libraries, creates mmdvm user in dialout, configures hostname/timezone & Pi UART.',
  },
  {
    index: 2,
    title: 'Install AllStarLink 3 & Asterisk Configs',
    detail: 'Adds official ASL3 Debian 12/13 repo, installs asl3, asl3-asterisk, asl3-menu (and optional allmon3), and writes /etc/asterisk/*.conf.',
  },
  {
    index: 3,
    title: 'Install DVSwitch & Bridge Configs',
    detail: 'Adds DVSwitch repository, installs Analog_Bridge, MMDVM_Bridge, and md380-emu, and writes /opt/Analog_Bridge & /opt/MMDVM_Bridge configs.',
  },
  {
    index: 4,
    title: 'Compile & Install g4klx/MMDVMHost',
    detail: 'Clones upstream g4klx/MMDVMHost, compiles with all CPU cores, and installs /usr/local/bin/MMDVMHost.',
  },
  {
    index: 5,
    title: 'Compile & Install g4klx/DMRGateway',
    detail: 'Clones upstream g4klx/DMRGateway, compiles binary, and installs /usr/local/bin/DMRGateway.',
  },
  {
    index: 6,
    title: 'Write MMDVM Configs, Firewall & Start Services',
    detail: 'Downloads DMRIds.dat, writes /etc/mmdvm/*.ini, applies UFW rules, enables and starts all enabled systemd units.',
  },
];

export function InstallerView({
  config,
  issues,
  localNode,
  onStartInstall,
  onApplyConfig,
  onNavigate,
}: InstallerViewProps) {
  const logRef = useRef<HTMLPreElement | null>(null);
  const errors = issues.filter((i) => i.severity === 'error');
  const job = localNode.job;
  const running = job.status === 'running';
  const anyInstalled =
    localNode.installed.mmdvmhost || localNode.installed.asterisk || localNode.installed.dvswitch;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [job.logs.length]);

  const handleDownloadScript = () => {
    downloadTextFile('install-node.sh', generateInstallScript(config), 'text/x-shellscript');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AllStarLink, DVSwitch &amp; MMDVM Installer
          </h1>
          <p className="text-sm text-slate-700 dark:text-blue-200/80 mt-1">
            Review your pre-install settings and install AllStarLink 3, DVSwitch, MMDVMHost, and DMRGateway on this host—or export a standalone bash installer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadScript}
          className="min-h-[40px] px-3.5 py-2 rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-[#0d2240] text-xs font-semibold text-slate-800 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/40 inline-flex items-center gap-2 whitespace-nowrap self-start"
        >
          <Download className="w-4 h-4" />
          <span>Download install-node.sh</span>
        </button>
      </div>

      {/* Pre-Install Summary Strip */}
      <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pre-Install Configuration Summary
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('configurator', 'station')}
              className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit MMDVM</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('configurator', 'allstar-nodes')}
              className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit AllStarLink</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('configurator', 'dvswitch')}
              className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit DVSwitch</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-500 dark:text-blue-300/80">AllStarLink 3</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">
              {config.allstar.enabled
                ? `Node ${config.allstar.nodeNumber}${config.allstar.additionalNodes.length > 0 ? ` (+${config.allstar.additionalNodes.length})` : ''}`
                : 'Disabled'}
            </p>
            <p className="text-slate-500 dark:text-blue-300/75 font-mono">
              {config.allstar.enabled
                ? `${config.allstar.radioInterface} · IAX2 :${config.allstar.iaxPort}`
                : 'Skipped during install'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-slate-500 dark:text-blue-300/80">DVSwitch Bridge</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">
              {config.dvswitch.enabled
                ? `${config.dvswitch.defaultMode} · TG ${config.dvswitch.defaultTalkgroup}`
                : 'Disabled'}
            </p>
            <p className="text-slate-500 dark:text-blue-300/75 font-mono">
              {config.dvswitch.enabled
                ? `USRP ${config.dvswitch.bridgeNodeNumber || 'direct'} · ${config.dvswitch.ambeMode}`
                : 'Skipped during install'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-slate-500 dark:text-blue-300/80">MMDVM Station &amp; Modem</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">
              {config.modem.enabled
                ? `${config.station.callsign} · ID ${getFullDmrId(config)}`
                : 'Disabled'}
            </p>
            <p className="text-slate-500 dark:text-blue-300/75 font-mono">
              {config.modem.enabled
                ? `${config.modem.protocol === 'null' ? 'null modem' : config.modem.uartPort} · ${config.station.rxFrequencyMhz} MHz`
                : 'Skipped during install'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-slate-500 dark:text-blue-300/80">Target Host Binaries</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">
              ASL: {localNode.installed.asterisk ? 'Yes' : 'No'} · DVS: {localNode.installed.dvswitch ? 'Yes' : 'No'}
            </p>
            <p className="text-slate-500 dark:text-blue-300/75 font-mono">
              MMDVM: {localNode.installed.mmdvmhost ? 'Yes' : 'No'} · DMRGw: {localNode.installed.dmrgateway ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="p-3 rounded-md border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 text-xs text-red-800 dark:text-red-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Resolve {errors.length} configuration error{errors.length === 1 ? '' : 's'} before installing:</span>
            </p>
            {errors.map((e) => (
              <p key={e.id}>· {e.message}</p>
            ))}
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={errors.length > 0 || running}
            onClick={onStartInstall}
            className="min-h-[44px] px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
          >
            {running && job.mode === 'install' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>
              {anyInstalled ? 'Reinstall / Upgrade Selected Stack' : 'Install Selected Stack'}
            </span>
          </button>

          {anyInstalled && (
            <button
              type="button"
              disabled={errors.length > 0 || running}
              onClick={onApplyConfig}
              className="min-h-[44px] px-4 py-2.5 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-900 dark:text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              {running && job.mode === 'apply' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Apply Edited Configs Only (Skip Reinstall)</span>
            </button>
          )}
        </div>
      </div>

      {/* 6-Step Progress & Live Console Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            6-Step Installation Pipeline
          </h2>
          <ol className="space-y-4">
            {INSTALL_STEPS.map((s) => {
              const isDone = job.mode === 'install' && (job.status === 'succeeded' || job.stepIndex > s.index);
              const isActive = job.mode === 'install' && job.status === 'running' && job.stepIndex === s.index;
              return (
                <li key={s.index} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-sky-400 animate-spin" />
                    ) : (
                      <span className="inline-flex items-center justify-center w-4 h-4 text-[11px] font-mono font-semibold text-slate-500 dark:text-blue-300">
                        {s.index}.
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">{s.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Execution Output
              </h2>
              <p className="text-xs text-slate-500 dark:text-blue-300/75">
                {job.step || 'Ready to run installer or apply config files.'}
              </p>
            </div>
            <span
              className={`text-xs font-mono font-semibold ${
                job.status === 'succeeded'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : job.status === 'failed'
                    ? 'text-red-700 dark:text-red-400'
                    : job.status === 'running'
                      ? 'text-blue-700 dark:text-sky-400'
                      : 'text-slate-500 dark:text-blue-300'
              }`}
            >
              {job.status === 'idle' ? 'Idle' : job.status.toUpperCase()}
            </span>
          </div>

          {job.error && (
            <div className="p-2.5 rounded-md border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 text-xs text-red-700 dark:text-red-300">
              {job.error}
            </div>
          )}

          <pre
            ref={logRef}
            className="h-96 overflow-auto rounded-md bg-[#061224] text-blue-100 p-3.5 text-xs leading-relaxed font-mono border border-blue-900/70"
          >
            {job.logs.length > 0
              ? job.logs.join('\n')
              : 'Click "Install Selected Stack" to install AllStarLink 3, DVSwitch, MMDVMHost & DMRGateway, or "Apply Edited Configs Only" to write updated config files without reinstalling.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
