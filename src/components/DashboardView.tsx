import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Link2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Square,
  Unlink,
} from 'lucide-react';
import { ConfigTab, MmdvmConfiguration, WorkspaceView } from '../types/mmdvmConfig';
import { LocalNodeController, ServiceAction, ServiceUnit } from '../hooks/useLocalNode';

interface DashboardViewProps {
  config: MmdvmConfiguration;
  hasUnsavedChanges: boolean;
  hasErrors: boolean;
  localNode: LocalNodeController;
  onApplyConfig: () => Promise<void>;
  onNavigate: (view: WorkspaceView, tab?: ConfigTab) => void;
}

type ModeFilter = 'ALL' | 'DMR' | 'YSF' | 'D-Star';

function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function statusMeta(state: string | undefined): { label: string; color: string } {
  if (state === 'active') return { label: 'Running', color: 'text-emerald-700 dark:text-emerald-400' };
  if (state === 'activating') return { label: 'Starting', color: 'text-amber-700 dark:text-amber-400' };
  if (state === 'failed') return { label: 'Failed', color: 'text-red-700 dark:text-red-400' };
  return { label: 'Stopped', color: 'text-slate-500 dark:text-blue-300/70' };
}

export function DashboardView({
  config,
  hasUnsavedChanges,
  hasErrors,
  localNode,
  onApplyConfig,
  onNavigate,
}: DashboardViewProps) {
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [aslSearch, setAslSearch] = useState('');
  const [selectedAslLocalNode, setSelectedAslLocalNode] = useState<string>('');
  const [targetAslNode, setTargetAslNode] = useState('');

  const aslState = localNode.services.asterisk || 'inactive';
  const mmdvmState = localNode.services.mmdvmhost || 'inactive';
  const gwState = localNode.services.dmrgateway || 'inactive';
  const allmonState = localNode.services.allmon3 || 'inactive';
  const abState = localNode.services.analog_bridge || 'inactive';
  const mbState = localNode.services.mmdvm_bridge || 'inactive';
  const emuState = localNode.services['md380-emu'] || 'inactive';

  const aslStatus = statusMeta(aslState);
  const mmdvmStatus = statusMeta(mmdvmState);
  const dvsCombinedState =
    abState === 'active' && mbState === 'active'
      ? 'active'
      : abState === 'failed' || mbState === 'failed'
        ? 'failed'
        : abState === 'active' || mbState === 'active'
          ? 'activating'
          : 'inactive';
  const dvsStatus = statusMeta(dvsCombinedState);

  const activeUsers = localNode.live?.activeTransmissions || [];
  const recentUsers = localNode.live?.recentUsers || [];

  const configuredAslNodes = useMemo(() => {
    const list: string[] = [];
    if (config.allstar.nodeNumber.trim()) list.push(config.allstar.nodeNumber.trim());
    for (const extra of config.allstar.additionalNodes) {
      if (extra.nodeNumber.trim() && !list.includes(extra.nodeNumber.trim())) {
        list.push(extra.nodeNumber.trim());
      }
    }
    return list;
  }, [config.allstar.nodeNumber, config.allstar.additionalNodes]);

  const liveAslNodes = localNode.live?.allstar?.nodes || [];
  const activeLocalNode =
    selectedAslLocalNode && configuredAslNodes.includes(selectedAslLocalNode)
      ? selectedAslLocalNode
      : liveAslNodes[0]?.node || configuredAslNodes[0] || '';

  const activeLocalNodeStatus = liveAslNodes.find((n) => n.node === activeLocalNode) || liveAslNodes[0];

  const allConnectedAslNodes = useMemo(() => {
    const rows = activeLocalNodeStatus
      ? activeLocalNodeStatus.connectedNodes
      : liveAslNodes.flatMap((n) => n.connectedNodes);
    const q = aslSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.node.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.mode.toLowerCase().includes(q)
    );
  }, [activeLocalNodeStatus, liveAslNodes, aslSearch]);

  const totalAslConnected = localNode.live?.allstar?.totalConnected ?? 0;

  const filteredActivity = useMemo(() => {
    const combined = [...activeUsers, ...recentUsers];
    const q = search.trim().toLowerCase();
    return combined.filter((row) => {
      if (modeFilter !== 'ALL' && row.modeGroup !== modeFilter) return false;
      if (!q) return true;
      return (
        row.callsign.toLowerCase().includes(q) ||
        row.dmrId.toLowerCase().includes(q) ||
        row.target.toLowerCase().includes(q) ||
        row.mode.toLowerCase().includes(q)
      );
    });
  }, [activeUsers, recentUsers, modeFilter, search]);

  const handleServiceAction = async (unit: ServiceUnit, action: ServiceAction) => {
    await localNode.controlService(unit, action);
  };

  const handleAslConnect = async (e: FormEvent, mode: 'connect' | 'monitor') => {
    e.preventDefault();
    const cleaned = targetAslNode.replace(/\D/g, '');
    if (!activeLocalNode || !cleaned) return;
    await localNode.sendAslCommand(activeLocalNode, mode, cleaned);
    setTargetAslNode('');
  };

  const notInstalledYet =
    localNode.hostAvailable &&
    !localNode.installed.mmdvmhost &&
    !localNode.installed.asterisk &&
    !localNode.installed.dvswitch;
  const hostErr = config.modem.enabled && mmdvmState !== 'active' ? localNode.live?.mmdvmhostLastError : null;
  const gwErr =
    config.modem.enabled && config.networks.dmrEnable && gwState !== 'active'
      ? localNode.live?.dmrgatewayLastError
      : null;

  const serviceRows: { unit: ServiceUnit; label: string; desc: string; state: string }[] = [
    ...(config.allstar.enabled || localNode.installed.asterisk
      ? [
          {
            unit: 'asterisk' as ServiceUnit,
            label: 'asterisk.service',
            desc: 'AllStarLink 3 PBX / app_rpt',
            state: aslState,
          },
        ]
      : []),
    ...(config.dvswitch.enabled || localNode.installed.dvswitch
      ? [
          {
            unit: 'analog_bridge' as ServiceUnit,
            label: 'analog_bridge.service',
            desc: 'DVSwitch USRP ↔ AMBE Bridge',
            state: abState,
          },
          {
            unit: 'mmdvm_bridge' as ServiceUnit,
            label: 'mmdvm_bridge.service',
            desc: 'DVSwitch Digital Voice Bridge',
            state: mbState,
          },
          {
            unit: 'md380-emu' as ServiceUnit,
            label: 'md380-emu.service',
            desc: 'Software AMBE Vocoder',
            state: emuState,
          },
        ]
      : []),
    ...(config.modem.enabled || localNode.installed.mmdvmhost
      ? [
          {
            unit: 'mmdvmhost' as ServiceUnit,
            label: 'mmdvmhost.service',
            desc: 'RF Modem & Multi-Mode Host',
            state: mmdvmState,
          },
          {
            unit: 'dmrgateway' as ServiceUnit,
            label: 'dmrgateway.service',
            desc: 'DMR Master Authentication Bridge',
            state: gwState,
          },
        ]
      : []),
    ...(config.allstar.installAllmon3
      ? [
          {
            unit: 'allmon3' as ServiceUnit,
            label: 'allmon3.service',
            desc: 'Allmon3 Web Monitor',
            state: allmonState,
          },
        ]
      : []),
  ];

  const logUnits: ServiceUnit[] = ['asterisk', 'analog_bridge', 'mmdvm_bridge', 'mmdvmhost', 'dmrgateway'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AllStarLink, DVSwitch &amp; MMDVM Live Status
          </h1>
          <p className="text-sm text-slate-700 dark:text-blue-200/80 mt-0.5 font-mono tabular-nums">
            {config.allstar.enabled ? `ASL ${config.allstar.nodeNumber}` : 'ASL off'}
            {' · '}
            {config.dvswitch.enabled ? `DVSwitch ${config.dvswitch.defaultMode} TG ${config.dvswitch.defaultTalkgroup}` : 'DVSwitch off'}
            {' · '}
            {config.modem.enabled
              ? `${config.station.callsign} ${config.station.rxFrequencyMhz} MHz`
              : 'MMDVM off'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => localNode.setAutoRefresh(!localNode.autoRefresh)}
            className="min-h-[38px] px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0d2240] text-xs font-medium text-slate-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {localNode.autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{localNode.autoRefresh ? 'Pause Poll' : 'Resume Poll'}</span>
          </button>
          <button
            type="button"
            onClick={() => localNode.refreshAll()}
            className="min-h-[38px] px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#0d2240] text-xs font-medium text-slate-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* First-Time Pre-Install Callout */}
      {notInstalledYet && (
        <div className="p-4 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-[#0d2240] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              AllStarLink 3, DVSwitch &amp; MMDVMHost are not installed on {localNode.hostname} yet
            </p>
            <p className="text-xs text-slate-600 dark:text-blue-300">
              Configure your MMDVM modem, AllStarLink nodes, and DVSwitch bridge on their dedicated tabs, then run the 6-step Installer.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('configurator', 'station')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-md border border-blue-300 dark:border-blue-700 text-xs font-semibold text-blue-900 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/40 whitespace-nowrap"
            >
              Open Configurator
            </button>
            <button
              type="button"
              onClick={() => onNavigate('installer')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white whitespace-nowrap"
            >
              Run Installer
            </button>
          </div>
        </div>
      )}

      {/* Unsaved Config Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-amber-950 dark:text-amber-200">
            <p className="font-semibold text-sm">You have unapplied configuration edits</p>
            <p className="mt-0.5">
              Apply them directly to /etc/asterisk/*.conf, /opt/*_Bridge/*.ini, and /etc/mmdvm/*.ini and reload services without reinstalling packages.
            </p>
          </div>
          <button
            type="button"
            disabled={hasErrors || localNode.job.status === 'running'}
            onClick={onApplyConfig}
            className="min-h-[38px] px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {localNode.job.status === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Apply Config Now</span>
          </button>
        </div>
      )}

      {/* Service Error Diagnostics Banner */}
      {(hostErr || gwErr) && (
        <div className="p-4 rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-2.5 text-xs text-red-900 dark:text-red-300 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-sm">Service Startup Diagnostic</p>
              {hostErr && <p className="font-mono break-all">MMDVMHost: {hostErr}</p>}
              {gwErr && <p className="font-mono break-all">DMRGateway: {gwErr}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('configurator', hostErr ? 'modem' : 'networks')}
            className="min-h-[36px] px-3 py-1.5 rounded-md border border-red-300 dark:border-red-800 text-xs font-semibold text-red-800 dark:text-red-200 hover:bg-red-100/60 dark:hover:bg-red-900/30 whitespace-nowrap shrink-0"
          >
            {hostErr ? 'Configure Modem Port' : 'Configure DMR Master'}
          </button>
        </div>
      )}

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-4 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-blue-300/80">AllStarLink 3</p>
          <p className={`text-lg font-bold font-display ${config.allstar.enabled ? aslStatus.color : 'text-slate-500 dark:text-blue-300/60'}`}>
            {config.allstar.enabled ? aslStatus.label : 'Disabled'}
          </p>
          <p className="text-xs text-slate-500 dark:text-blue-300/75 font-mono tabular-nums truncate">
            {config.allstar.enabled
              ? `Node ${config.allstar.nodeNumber} · ${totalAslConnected} linked`
              : 'AllStarLink disabled'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-4 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-blue-300/80">DVSwitch Bridge</p>
          <p className={`text-lg font-bold font-display ${config.dvswitch.enabled ? dvsStatus.color : 'text-slate-500 dark:text-blue-300/60'}`}>
            {config.dvswitch.enabled ? dvsStatus.label : 'Disabled'}
          </p>
          <p className="text-xs text-slate-500 dark:text-blue-300/75 font-mono tabular-nums truncate">
            {config.dvswitch.enabled
              ? `${config.dvswitch.defaultMode} · TG ${config.dvswitch.defaultTalkgroup}${config.dvswitch.bridgeNodeNumber ? ` · Node ${config.dvswitch.bridgeNodeNumber}` : ''}`
              : 'DVSwitch disabled'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-4 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-blue-300/80">MMDVMHost / DMR</p>
          <p
            className={`text-lg font-bold font-display ${
              !config.modem.enabled
                ? 'text-slate-500 dark:text-blue-300/60'
                : localNode.live?.dmrMasterConnected
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : mmdvmStatus.color
            }`}
          >
            {!config.modem.enabled
              ? 'Disabled'
              : localNode.live?.dmrMasterConnected && mmdvmState === 'active'
                ? 'Master Linked'
                : mmdvmStatus.label}
          </p>
          <p className="text-xs text-slate-500 dark:text-blue-300/75 font-mono truncate">
            {!config.modem.enabled
              ? 'MMDVM disabled'
              : config.modem.protocol === 'null'
                ? 'Protocol=null'
                : `${config.modem.uartPort} @ ${config.modem.uartSpeed}`}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-4 space-y-1 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-blue-300/80">Host Telemetry</p>
          <p className="text-lg font-bold font-display font-mono tabular-nums text-slate-900 dark:text-white">
            {formatUptime(localNode.live?.uptimeSeconds)}
            {localNode.live?.cpuTempC != null ? ` · ${localNode.live.cpuTempC}°C` : ''}
          </p>
          <p className="text-xs text-slate-500 dark:text-blue-300/75 font-mono tabular-nums truncate">
            {activeUsers.length} live · {recentUsers.length} MMDVM heard
          </p>
        </div>
      </div>

      {/* AllStarLink Connected Nodes Section */}
      {(config.allstar.enabled || localNode.installed.asterisk) && (
        <section className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  AllStarLink Connected Nodes
                </h2>
                {activeLocalNodeStatus && (
                  <span
                    className={`text-xs font-mono font-semibold ${
                      activeLocalNodeStatus.registered === 'Registered'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Node {activeLocalNodeStatus.node} · {activeLocalNodeStatus.registered}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                Live linked nodes queried from Asterisk app_rpt with instant link control.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {configuredAslNodes.length > 1 && (
                <select
                  aria-label="Select local AllStarLink node"
                  value={activeLocalNode}
                  onChange={(e) => setSelectedAslLocalNode(e.target.value)}
                  className="min-h-[36px] px-2.5 py-1 text-xs font-mono rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                >
                  {configuredAslNodes.map((n) => (
                    <option key={n} value={n}>
                      Local Node {n}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={aslSearch}
                  onChange={(e) => setAslSearch(e.target.value)}
                  placeholder="Filter linked nodes..."
                  aria-label="Filter connected AllStarLink nodes"
                  className="min-h-[36px] w-44 pl-8 pr-2.5 py-1 text-xs rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50"
                />
              </div>

              <button
                type="button"
                onClick={() => onNavigate('configurator', 'allstar-nodes')}
                className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline whitespace-nowrap px-1"
              >
                Edit AllStarLink
              </button>
            </div>
          </div>

          {/* Link Control Bar */}
          <form
            onSubmit={(e) => handleAslConnect(e, 'connect')}
            className="flex flex-wrap items-center gap-2 pt-3 border-t border-blue-100 dark:border-blue-800/70"
          >
            <input
              type="text"
              inputMode="numeric"
              value={targetAslNode}
              onChange={(e) => setTargetAslNode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Target node # (e.g. 55553)"
              aria-label="Target AllStarLink node number"
              className="min-h-[36px] w-48 px-3 py-1.5 text-xs font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50"
            />
            <button
              type="submit"
              disabled={localNode.aslBusy || !activeLocalNode || !targetAslNode}
              className="min-h-[36px] px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Connect (*3)</span>
            </button>
            <button
              type="button"
              disabled={localNode.aslBusy || !activeLocalNode || !targetAslNode}
              onClick={(e) => handleAslConnect(e, 'monitor')}
              className="min-h-[36px] px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 disabled:opacity-50 text-slate-800 dark:text-blue-100 text-xs font-medium whitespace-nowrap"
            >
              Monitor (*2)
            </button>
            {config.dvswitch.enabled && config.dvswitch.bridgeNodeNumber && (
              <button
                type="button"
                disabled={localNode.aslBusy || !activeLocalNode}
                onClick={() => localNode.sendAslCommand(activeLocalNode, 'connect', config.dvswitch.bridgeNodeNumber)}
                className="min-h-[36px] px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 disabled:opacity-50 text-blue-700 dark:text-sky-300 text-xs font-medium whitespace-nowrap"
              >
                Link DVSwitch ({config.dvswitch.bridgeNodeNumber})
              </button>
            )}
            <button
              type="button"
              disabled={localNode.aslBusy || !activeLocalNode}
              onClick={() => localNode.sendAslCommand(activeLocalNode, 'disconnect_all')}
              className="min-h-[36px] px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap ml-auto"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect All (*76)</span>
            </button>
          </form>

          {localNode.aslMessage && (
            <p className="text-xs text-slate-700 dark:text-blue-100 bg-blue-50 dark:bg-[#07162b] px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
              {localNode.aslMessage}
            </p>
          )}

          {allConnectedAslNodes.length === 0 ? (
            <div className="py-8 text-center border-t border-blue-100 dark:border-blue-800/70 space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-blue-100">
                {localNode.hostAvailable
                  ? `No remote AllStarLink nodes connected to ${activeLocalNode || 'this node'}`
                  : 'Preview Mode — Connected AllStarLink nodes appear here when running on your host'}
              </p>
              <p className="text-xs text-slate-500 dark:text-blue-300/75">
                Enter a remote node number above to link via *3 (Transceive) or *2 (Monitor).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-blue-100 dark:border-blue-800/70">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-blue-100 dark:border-blue-800/70 text-slate-500 dark:text-blue-300/80">
                    <th className="py-2.5 pr-3 font-medium">Node</th>
                    <th className="py-2.5 pr-3 font-medium">Callsign / Location</th>
                    <th className="py-2.5 pr-3 font-medium">Mode</th>
                    <th className="py-2.5 pr-3 font-medium">Direction</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Elapsed</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/70 dark:divide-blue-800/50">
                  {allConnectedAslNodes.map((row) => (
                    <tr key={`${row.localNode}-${row.node}`} className="hover:bg-blue-50/70 dark:hover:bg-blue-900/30">
                      <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                        {row.node}
                        {row.keyed && (
                          <span className="ml-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            RX Keyed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700 dark:text-blue-100">
                        {row.description || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-blue-300 whitespace-nowrap">
                        {row.mode}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-blue-300 whitespace-nowrap">
                        {row.direction}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-right text-slate-600 dark:text-blue-300 whitespace-nowrap">
                        {row.elapsed}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={localNode.aslBusy}
                          onClick={() => localNode.sendAslCommand(row.localNode, 'disconnect', row.node)}
                          className="text-xs font-medium text-red-700 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Main 2-Column Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: MMDVM Active & Last Heard Users */}
        <section className="lg:col-span-7 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                MMDVM Active &amp; Last Heard Users
              </h2>
              <p className="text-xs text-slate-500 dark:text-blue-300/75">
                Real-time RF and network transmissions parsed from MMDVMHost.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search callsign or TG..."
                  aria-label="Search MMDVM activity"
                  className="min-h-[36px] w-44 pl-8 pr-2.5 py-1 text-xs rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50"
                />
              </div>
              <button
                type="button"
                onClick={() => onNavigate('configurator', 'modem')}
                className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline whitespace-nowrap"
              >
                Edit Modem
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-blue-50 dark:bg-[#07162b] border border-blue-200/80 dark:border-blue-800 rounded-md w-fit">
              {(['ALL', 'DMR', 'YSF', 'D-Star'] as ModeFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModeFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    modeFilter === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-blue-200 hover:text-blue-950 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All Modes' : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {mmdvmState !== 'active' && gwState !== 'active' && (
                <button
                  type="button"
                  disabled={localNode.mmdvmBusy}
                  onClick={() => localNode.sendMmdvmCommand('reconnect')}
                  className="min-h-[34px] px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {localNode.mmdvmBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>Reconnect</span>
                </button>
              )}
              <button
                type="button"
                disabled={localNode.mmdvmBusy || (mmdvmState !== 'active' && mmdvmState !== 'activating' && gwState !== 'active')}
                onClick={() => localNode.sendMmdvmCommand('disconnect')}
                className="min-h-[34px] px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {localNode.mmdvmBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5" />
                )}
                <span>Disconnect MMDVM</span>
              </button>
            </div>
          </div>

          {localNode.mmdvmMessage && (
            <p className="text-xs text-slate-700 dark:text-blue-100 bg-blue-50 dark:bg-[#07162b] px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
              {localNode.mmdvmMessage}
            </p>
          )}

          {filteredActivity.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-t border-blue-100 dark:border-blue-800/70">
              <p className="text-sm font-medium text-slate-700 dark:text-blue-100">
                {localNode.hostAvailable
                  ? 'No recent digital voice transmissions logged yet'
                  : 'Preview Mode — Live traffic appears when running on your Pi or Debian host'}
              </p>
              <p className="text-xs text-slate-500 dark:text-blue-300/75 max-w-md mx-auto">
                Key up on {config.station.rxFrequencyMhz} MHz (CC {config.networks.dmrColorCode}) or wait for incoming network talkgroup traffic to see live callsigns here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-blue-100 dark:border-blue-800/70">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-blue-100 dark:border-blue-800/70 text-slate-500 dark:text-blue-300/80">
                    <th className="py-2.5 pr-3 font-medium">Time</th>
                    <th className="py-2.5 pr-3 font-medium">Callsign</th>
                    <th className="py-2.5 pr-3 font-medium">Mode</th>
                    <th className="py-2.5 pr-3 font-medium">Target</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Duration</th>
                    <th className="py-2.5 font-medium text-right">BER / Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/70 dark:divide-blue-800/50">
                  {filteredActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50/70 dark:hover:bg-blue-900/30">
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-500 dark:text-blue-300/80 whitespace-nowrap">
                        {row.timestamp}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {row.callsign}
                        </span>
                        {row.active && (
                          <span className="ml-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            TX Live
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700 dark:text-blue-100 whitespace-nowrap">
                        {row.mode} · {row.source}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-800 dark:text-blue-100 whitespace-nowrap">
                        {row.target}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-right text-slate-700 dark:text-blue-100 whitespace-nowrap">
                        {row.duration}
                      </td>
                      <td className="py-2.5 font-mono tabular-nums text-right text-slate-500 dark:text-blue-300/80 whitespace-nowrap">
                        {row.ber} / {row.loss}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Service Controls + Live Journal Log Viewer */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Service Controls
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('configurator', 'dvswitch')}
                className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline whitespace-nowrap"
              >
                Edit DVSwitch
              </button>
            </div>

            {localNode.serviceMessage && (
              <p className="text-xs text-slate-700 dark:text-blue-100 bg-blue-50 dark:bg-[#07162b] p-2.5 rounded-md border border-blue-200 dark:border-blue-800">
                {localNode.serviceMessage}
              </p>
            )}

            <div className="divide-y divide-blue-100 dark:divide-blue-800/70">
              {serviceRows.map((svc) => {
                const st = statusMeta(svc.state);
                return (
                  <div key={svc.unit} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium text-slate-900 dark:text-white truncate">
                        {svc.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-blue-300/75">
                        <span className={`font-semibold ${st.color}`}>{st.label}</span> · {svc.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={localNode.serviceBusy !== null}
                        onClick={() => handleServiceAction(svc.unit, 'start')}
                        title={`Start ${svc.label}`}
                        aria-label={`Start ${svc.label}`}
                        className="p-2 rounded-md border border-blue-200 dark:border-blue-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={localNode.serviceBusy !== null}
                        onClick={() => handleServiceAction(svc.unit, 'restart')}
                        title={`Restart ${svc.label}`}
                        aria-label={`Restart ${svc.label}`}
                        className="p-2 rounded-md border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 disabled:opacity-50"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={localNode.serviceBusy !== null}
                        onClick={() => handleServiceAction(svc.unit, 'stop')}
                        title={`Stop ${svc.label}`}
                        aria-label={`Stop ${svc.label}`}
                        className="p-2 rounded-md border border-blue-200 dark:border-blue-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Journal Log Viewer */}
          <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-blue-50 dark:bg-[#07162b] border border-blue-200/80 dark:border-blue-800 rounded-md overflow-x-auto">
                {logUnits.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => localNode.setLogsUnit(u)}
                    className={`px-2 py-1 text-[11px] font-mono font-medium rounded transition-colors whitespace-nowrap ${
                      localNode.logsUnit === u
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-blue-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={localNode.logsLoading}
                onClick={() => localNode.refreshLogs()}
                className="text-xs font-medium text-slate-700 dark:text-blue-200 hover:text-blue-950 dark:hover:text-white inline-flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${localNode.logsLoading ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>
            </div>

            <pre className="h-64 overflow-auto rounded-md bg-[#061224] text-blue-100 p-3 text-[11px] leading-relaxed font-mono border border-blue-900/70">
              {localNode.serviceLogs.length > 0
                ? localNode.serviceLogs.join('\n')
                : `No log lines returned for ${localNode.logsUnit}.service yet.`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
