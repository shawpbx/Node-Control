import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  COMMON_TIMEZONES,
  DMR_MASTER_PRESETS,
  MODEM_PRESETS,
  STANDARD_SERIAL_PORTS,
} from '../data/presets';
import {
  AslDuplexMode,
  AslRadioInterface,
  ConfigTab,
  DvSwitchMode,
  ExtraAllStarNode,
  MmdvmConfiguration,
  ValidationIssue,
  WorkspaceView,
} from '../types/mmdvmConfig';
import { mhzToHz } from '../utils/validation';
import { getFullDmrId } from '../utils/generators';
import { LocalNodeController } from '../hooks/useLocalNode';

interface ConfiguratorViewProps {
  config: MmdvmConfiguration;
  activeTab: ConfigTab;
  issues: ValidationIssue[];
  hasUnsavedChanges: boolean;
  localNode: LocalNodeController;
  onChange: (next: MmdvmConfiguration) => void;
  onTabChange: (tab: ConfigTab) => void;
  onApplyConfig: () => Promise<void>;
  onNavigate: (view: WorkspaceView) => void;
}

const MMDVM_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'station', label: 'MMDVM Station' },
  { id: 'modem', label: 'MMDVM Modem' },
  { id: 'networks', label: 'MMDVM Networks' },
];

const ALLSTAR_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'allstar-nodes', label: 'AllStarLink Nodes' },
  { id: 'allstar-audio', label: 'AllStarLink Radio & AMI' },
];

const DVSWITCH_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'dvswitch', label: 'DVSwitch Bridge' },
];

const SYSTEM_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'system', label: 'System & Account' },
];

const INPUT_CLASS =
  'w-full min-h-[40px] px-3 py-2 text-sm rounded-md border border-blue-200 dark:border-blue-800/80 bg-white dark:bg-[#07162b] text-slate-900 dark:text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

export function ConfiguratorView({
  config,
  activeTab,
  issues,
  hasUnsavedChanges,
  localNode,
  onChange,
  onTabChange,
  onApplyConfig,
  onNavigate,
}: ConfiguratorViewProps) {
  const [showDmrPass, setShowDmrPass] = useState(false);
  const [showDvsPass, setShowDvsPass] = useState(false);
  const [showAslPass, setShowAslPass] = useState(false);
  const [showAmiSecret, setShowAmiSecret] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const { station, modem, networks, allstar, dvswitch, system } = config;
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const tabIssues = issues.filter((i) => i.tab === activeTab);

  const rxHz = mhzToHz(station.rxFrequencyMhz);
  const txHz = mhzToHz(station.txFrequencyMhz);
  const fullDmrId = getFullDmrId(config);

  const updateStation = (patch: Partial<MmdvmConfiguration['station']>) => {
    const nextStation = { ...station, ...patch };
    if (!nextStation.duplex && patch.rxFrequencyMhz !== undefined) {
      nextStation.txFrequencyMhz = patch.rxFrequencyMhz;
    }
    onChange({ ...config, station: nextStation });
  };

  const updateModem = (patch: Partial<MmdvmConfiguration['modem']>) => {
    onChange({ ...config, modem: { ...modem, ...patch } });
  };

  const updateNetworks = (patch: Partial<MmdvmConfiguration['networks']>) => {
    onChange({ ...config, networks: { ...networks, ...patch } });
  };

  const updateAllStar = (patch: Partial<MmdvmConfiguration['allstar']>) => {
    onChange({ ...config, allstar: { ...allstar, ...patch } });
  };

  const updateDvSwitch = (patch: Partial<MmdvmConfiguration['dvswitch']>) => {
    onChange({ ...config, dvswitch: { ...dvswitch, ...patch } });
  };

  const updateSystem = (patch: Partial<MmdvmConfiguration['system']>) => {
    onChange({ ...config, system: { ...system, ...patch } });
  };

  const handleAddExtraNode = () => {
    const baseNum = Number(allstar.nodeNumber);
    const suggested =
      Number.isFinite(baseNum) && baseNum >= 1000
        ? String(baseNum + allstar.additionalNodes.length + 1)
        : '';
    const nextNode: ExtraAllStarNode = {
      id: `asl-extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nodeNumber: suggested,
      nodePassword: '',
      radioInterface: 'pseudo',
      duplexMode: '0',
    };
    updateAllStar({ additionalNodes: [...allstar.additionalNodes, nextNode] });
  };

  const handleUpdateExtraNode = (id: string, patch: Partial<ExtraAllStarNode>) => {
    updateAllStar({
      additionalNodes: allstar.additionalNodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const handleRemoveExtraNode = (id: string) => {
    updateAllStar({
      additionalNodes: allstar.additionalNodes.filter((n) => n.id !== id),
    });
  };

  const handlePresetChange = (presetId: string) => {
    const preset = MODEM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({
      ...config,
      station: {
        ...station,
        duplex: preset.duplex,
        txFrequencyMhz: preset.duplex ? station.txFrequencyMhz : station.rxFrequencyMhz,
      },
      modem: {
        ...modem,
        modemModel: preset.id,
        protocol: preset.protocol,
        uartPort: preset.uartPort,
        uartSpeed: preset.uartSpeed,
        rxInvert: preset.rxInvert,
        txInvert: preset.txInvert,
        pttInvert: preset.pttInvert,
        txDelay: preset.txDelay,
        dmrDelay: preset.dmrDelay,
        rxLevel: preset.rxLevel,
        txLevel: preset.txLevel,
        configurePiUart: preset.configurePiUart,
      },
      networks: {
        ...networks,
        dmrSlot1: preset.duplex,
      },
    });
  };

  const handleMasterPresetChange = (presetId: string) => {
    const preset = DMR_MASTER_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;
    updateNetworks({
      dmrMasterName: preset.label.split(' ')[0] || 'DMR_Master',
      dmrMasterHost: preset.host,
      dmrMasterPort: preset.port,
    });
  };

  const handleDvsMasterPresetChange = (presetId: string) => {
    const preset = DMR_MASTER_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;
    updateDvSwitch({
      dmrMasterHost: preset.host,
      dmrMasterPort: preset.port,
    });
  };

  const selectedModemPreset = MODEM_PRESETS.find((p) => p.id === modem.modemModel);
  const selectedMasterPreset =
    DMR_MASTER_PRESETS.find((p) => p.host && p.host === networks.dmrMasterHost.trim())?.id ||
    'custom';
  const selectedDvsMasterPreset =
    DMR_MASTER_PRESETS.find((p) => p.host && p.host === dvswitch.dmrMasterHost.trim())?.id ||
    'custom';

  const serialPortOptions = Array.from(
    new Set([...localNode.detectedSerialPorts, ...STANDARD_SERIAL_PORTS, modem.uartPort].filter(Boolean))
  );

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPwStatus(null);
    if (newPw.length < 8) {
      setPwStatus({ ok: false, text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setPwBusy(true);
    const err = await localNode.changePassword(curPw, newPw);
    setPwBusy(false);
    if (err) {
      setPwStatus({ ok: false, text: err });
    } else {
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      setPwStatus({ ok: true, text: 'Administrator password updated.' });
    }
  };

  const isRunningJob = localNode.job.status === 'running';
  const anyInstalled =
    localNode.installed.mmdvmhost || localNode.installed.asterisk || localNode.installed.dvswitch;

  const renderTabButton = (t: { id: ConfigTab; label: string }) => {
    const tabErrCount = issues.filter((i) => i.tab === t.id && i.severity === 'error').length;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onTabChange(t.id)}
        className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
          activeTab === t.id
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-700 dark:text-blue-200 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 hover:text-blue-950 dark:hover:text-white'
        }`}
      >
        <span>{t.label}</span>
        {tabErrCount > 0 && (
          <span
            className={`font-mono text-[11px] font-semibold ${
              activeTab === t.id ? 'text-amber-200' : 'text-red-600 dark:text-red-400'
            }`}
          >
            ({tabErrCount})
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Separated MMDVM / AllStarLink / DVSwitch / System Tab Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Node Configurator
          </h1>
          <p className="text-sm text-slate-700 dark:text-blue-200/80 mt-1">
            Configure MMDVM, AllStarLink 3, and DVSwitch on separate tabs before installation, or edit post-install and apply directly without reinstalling.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1.5 bg-white/85 dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg overflow-x-auto">
          {MMDVM_TABS.map(renderTabButton)}
          <div className="h-5 w-px bg-blue-200 dark:bg-blue-800 mx-1 shrink-0" aria-hidden="true" />
          {ALLSTAR_TABS.map(renderTabButton)}
          <div className="h-5 w-px bg-blue-200 dark:bg-blue-800 mx-1 shrink-0" aria-hidden="true" />
          {DVSWITCH_TABS.map(renderTabButton)}
          <div className="h-5 w-px bg-blue-200 dark:bg-blue-800 mx-1 shrink-0" aria-hidden="true" />
          {SYSTEM_TABS.map(renderTabButton)}
        </div>
      </div>

      {/* Tab-specific validation messages */}
      {tabIssues.length > 0 && (
        <div className="space-y-2">
          {tabIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                issue.severity === 'error'
                  ? 'border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 text-red-800 dark:text-red-300'
                  : 'border-amber-300 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/35 text-amber-900 dark:text-amber-300'
              }`}
            >
              {issue.severity === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active Tab Form Surface */}
      <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-6 shadow-xs">
        {/* ======================== MMDVM STATION TAB ======================== */}
        {activeTab === 'station' && (
          <div className="space-y-8">
            {!modem.enabled && (
              <div className="p-3.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-[#07162b] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 dark:text-blue-200">
                <span>MMDVMHost is currently disabled. Enable it to write /etc/mmdvm/MMDVM.ini and start mmdvmhost.service.</span>
                <button
                  type="button"
                  onClick={() => updateModem({ enabled: true })}
                  className="text-blue-700 dark:text-sky-400 font-semibold hover:underline whitespace-nowrap"
                >
                  Enable MMDVMHost
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="cfg-callsign" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  Station Callsign
                </label>
                <input
                  id="cfg-callsign"
                  type="text"
                  value={station.callsign}
                  onChange={(e) => updateStation({ callsign: e.target.value.toUpperCase() })}
                  placeholder="W7ABC"
                  className={`${INPUT_CLASS} font-mono uppercase`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-dmrid" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  RadioID DMR ID (7 digits)
                </label>
                <input
                  id="cfg-dmrid"
                  type="text"
                  inputMode="numeric"
                  value={station.dmrId}
                  onChange={(e) => updateStation({ dmrId: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                  placeholder="3101234"
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-essid" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  ESSID Suffix (optional 2 digits)
                </label>
                <input
                  id="cfg-essid"
                  type="text"
                  inputMode="numeric"
                  value={station.essidSuffix}
                  onChange={(e) => updateStation({ essidSuffix: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="01"
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
                <p className="text-xs text-slate-500 dark:text-blue-300/70 font-mono tabular-nums">
                  Active MMDVM Id={fullDmrId}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    RF Frequencies &amp; Calibration
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                    Enter frequencies in MHz; MMDVM.ini automatically writes exact Hz values.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-blue-50 dark:bg-[#07162b] border border-blue-200/80 dark:border-blue-800 rounded-md self-start">
                  <button
                    type="button"
                    onClick={() => updateStation({ duplex: false, txFrequencyMhz: station.rxFrequencyMhz })}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      !station.duplex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-blue-200'
                    }`}
                  >
                    Simplex
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStation({ duplex: true })}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      station.duplex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-blue-200'
                    }`}
                  >
                    Duplex / Repeater
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="cfg-rxfreq" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    RX Frequency (MHz)
                  </label>
                  <input
                    id="cfg-rxfreq"
                    type="text"
                    value={station.rxFrequencyMhz}
                    onChange={(e) => updateStation({ rxFrequencyMhz: e.target.value })}
                    placeholder="446.8000"
                    className={`${INPUT_CLASS} font-mono tabular-nums`}
                  />
                  <p className="text-xs text-slate-500 dark:text-blue-300/70 font-mono tabular-nums">
                    {rxHz ? `${rxHz.toLocaleString()} Hz` : 'Invalid MHz'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-txfreq" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    TX Frequency (MHz)
                  </label>
                  <input
                    id="cfg-txfreq"
                    type="text"
                    disabled={!station.duplex}
                    value={station.duplex ? station.txFrequencyMhz : station.rxFrequencyMhz}
                    onChange={(e) => updateStation({ txFrequencyMhz: e.target.value })}
                    placeholder="446.8000"
                    className={`${INPUT_CLASS} font-mono tabular-nums disabled:opacity-60`}
                  />
                  <p className="text-xs text-slate-500 dark:text-blue-300/70 font-mono tabular-nums">
                    {txHz ? `${txHz.toLocaleString()} Hz` : 'Invalid MHz'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-rxoff" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    RX Offset (Hz)
                  </label>
                  <input
                    id="cfg-rxoff"
                    type="number"
                    min={-5000}
                    max={5000}
                    value={station.rxOffset}
                    onChange={(e) => updateStation({ rxOffset: Number(e.target.value) || 0 })}
                    className={`${INPUT_CLASS} font-mono tabular-nums`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-txoff" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    TX Offset (Hz)
                  </label>
                  <input
                    id="cfg-txoff"
                    type="number"
                    min={-5000}
                    max={5000}
                    value={station.txOffset}
                    onChange={(e) => updateStation({ txOffset: Number(e.target.value) || 0 })}
                    className={`${INPUT_CLASS} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="cfg-rfpower" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    RF Level ({station.rfPower}%)
                  </label>
                  <input
                    id="cfg-rfpower"
                    type="range"
                    min={1}
                    max={100}
                    value={station.rfPower}
                    onChange={(e) => updateStation({ rfPower: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-location" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    Station Location
                  </label>
                  <input
                    id="cfg-location"
                    type="text"
                    value={station.location}
                    onChange={(e) => updateStation({ location: e.target.value })}
                    placeholder="Seattle, WA"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="cfg-desc" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    Description
                  </label>
                  <input
                    id="cfg-desc"
                    type="text"
                    value={station.description}
                    onChange={(e) => updateStation({ description: e.target.value })}
                    placeholder="MMDVM Digital Voice Hotspot"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={station.cwIdEnable}
                    onChange={(e) => updateStation({ cwIdEnable: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>Enable Periodic CW Station ID</span>
                </label>

                {station.cwIdEnable && (
                  <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="cfg-cwtime" className="text-slate-600 dark:text-blue-300">
                      Interval (min):
                    </label>
                    <input
                      id="cfg-cwtime"
                      type="number"
                      min={1}
                      max={60}
                      value={station.cwIdTimeMinutes}
                      onChange={(e) => updateStation({ cwIdTimeMinutes: Math.max(1, Number(e.target.value) || 10) })}
                      className="w-20 min-h-[36px] px-2.5 py-1 text-sm font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================== MMDVM MODEM TAB ======================== */}
        {activeTab === 'modem' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-blue-100 dark:border-blue-800/70">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  MMDVMHost RF Modem Service
                </h2>
                <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                  Toggle MMDVMHost + DMRGateway on or off independently of AllStarLink 3 and DVSwitch.
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={modem.enabled}
                  onChange={(e) => updateModem({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Enable MMDVMHost</span>
              </label>
            </div>

            {modem.enabled && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="cfg-modem-preset" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Modem Hardware Preset
                    </label>
                    <select
                      id="cfg-modem-preset"
                      value={modem.modemModel}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      {(['GPIO Hotspot', 'USB Hotspot', 'Repeater Board', 'Testing / Custom'] as const).map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {MODEM_PRESETS.filter((p) => p.category === cat).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {selectedModemPreset && (
                      <p className="text-xs text-slate-500 dark:text-blue-300/75">{selectedModemPreset.notes}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cfg-uart-port" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Serial / UART Device Port
                    </label>
                    <select
                      id="cfg-uart-port"
                      value={modem.protocol === 'null' ? 'null' : modem.uartPort}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateModem({
                          protocol: val === 'null' ? 'null' : 'uart',
                          uartPort: val,
                        });
                      }}
                      className={`${INPUT_CLASS} font-mono`}
                    >
                      {serialPortOptions.map((port) => {
                        const detected = localNode.detectedSerialPorts.includes(port);
                        return (
                          <option key={port} value={port}>
                            {port === 'null'
                              ? 'null (Null Modem — no physical RF hardware)'
                              : detected
                                ? `${port} (detected on host)`
                                : port}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-blue-300/75">
                      <span>
                        {localNode.detectedSerialPorts.length > 0
                          ? `Detected on host: ${localNode.detectedSerialPorts.join(', ')}`
                          : 'No /dev/ttyAMA*, ttyACM*, or ttyUSB* devices detected yet.'}
                      </span>
                      {modem.protocol !== 'null' && (
                        <button
                          type="button"
                          onClick={() => handlePresetChange('null_modem')}
                          className="text-blue-700 dark:text-sky-400 font-medium hover:underline whitespace-nowrap shrink-0"
                        >
                          Use Null Modem
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-5">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Serial Speed, Polarity &amp; Modulation Levels
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-baud" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        UART Baud Rate
                      </label>
                      <select
                        id="cfg-baud"
                        value={modem.uartSpeed}
                        onChange={(e) => updateModem({ uartSpeed: Number(e.target.value) })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      >
                        <option value={115200}>115200</option>
                        <option value={230400}>230400</option>
                        <option value={460800}>460800</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-txdelay" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        TXDelay (ms)
                      </label>
                      <input
                        id="cfg-txdelay"
                        type="number"
                        min={0}
                        max={500}
                        value={modem.txDelay}
                        onChange={(e) => updateModem({ txDelay: Number(e.target.value) || 0 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmrdelay" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        DMRDelay
                      </label>
                      <input
                        id="cfg-dmrdelay"
                        type="number"
                        min={0}
                        max={500}
                        value={modem.dmrDelay}
                        onChange={(e) => updateModem({ dmrDelay: Number(e.target.value) || 0 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-rxlevel" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        RXLevel (%)
                      </label>
                      <input
                        id="cfg-rxlevel"
                        type="number"
                        min={0}
                        max={100}
                        value={modem.rxLevel}
                        onChange={(e) => updateModem({ rxLevel: Number(e.target.value) || 0 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-txlevel" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        TXLevel (%)
                      </label>
                      <input
                        id="cfg-txlevel"
                        type="number"
                        min={0}
                        max={100}
                        value={modem.txLevel}
                        onChange={(e) => updateModem({ txLevel: Number(e.target.value) || 0 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modem.rxInvert}
                        onChange={(e) => updateModem({ rxInvert: e.target.checked })}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span>RXInvert</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modem.txInvert}
                        onChange={(e) => updateModem({ txInvert: e.target.checked })}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span>TXInvert</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modem.pttInvert}
                        onChange={(e) => updateModem({ pttInvert: e.target.checked })}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span>PTTInvert</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modem.configurePiUart}
                        onChange={(e) => updateModem({ configurePiUart: e.target.checked })}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span>Auto-enable Raspberry Pi GPIO UART during install</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================== MMDVM NETWORKS TAB ======================== */}
        {activeTab === 'networks' && (
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    DMR Mode &amp; DMRGateway Master Connection
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                    MMDVMHost links locally on 127.0.0.1:62033 ↔ 62031 to DMRGateway, which authenticates to your DMR master server.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={networks.dmrEnable}
                    onChange={(e) => updateNetworks({ dmrEnable: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>Enable DMR</span>
                </label>
              </div>

              {networks.dmrEnable && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmr-preset" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Master Server Preset
                      </label>
                      <select
                        id="cfg-dmr-preset"
                        value={selectedMasterPreset}
                        onChange={(e) => handleMasterPresetChange(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        {DMR_MASTER_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmr-host" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        DMR Master Host
                      </label>
                      <input
                        id="cfg-dmr-host"
                        type="text"
                        value={networks.dmrMasterHost}
                        onChange={(e) => updateNetworks({ dmrMasterHost: e.target.value })}
                        placeholder="3102.repeater.net"
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmr-port" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Master UDP Port
                      </label>
                      <input
                        id="cfg-dmr-port"
                        type="number"
                        min={1024}
                        max={65535}
                        value={networks.dmrMasterPort}
                        onChange={(e) => updateNetworks({ dmrMasterPort: Number(e.target.value) || 62031 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmr-cc" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Color Code (0–15)
                      </label>
                      <input
                        id="cfg-dmr-cc"
                        type="number"
                        min={0}
                        max={15}
                        value={networks.dmrColorCode}
                        onChange={(e) => updateNetworks({ dmrColorCode: Number(e.target.value) || 0 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label htmlFor="cfg-dmr-pass" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Hotspot Security Password
                      </label>
                      <div className="relative">
                        <input
                          id="cfg-dmr-pass"
                          type={showDmrPass ? 'text' : 'password'}
                          value={networks.dmrMasterPassword}
                          onChange={(e) => updateNetworks({ dmrMasterPassword: e.target.value })}
                          placeholder="BrandMeister SelfCare Hotspot Security password"
                          className={`${INPUT_CLASS} pr-10 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowDmrPass((v) => !v)}
                          aria-label={showDmrPass ? 'Hide DMR password' : 'Show DMR password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-blue-200"
                        >
                          {showDmrPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pb-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!station.duplex}
                          checked={station.duplex && networks.dmrSlot1}
                          onChange={(e) => updateNetworks({ dmrSlot1: e.target.checked })}
                          className="w-4 h-4 rounded accent-blue-600 disabled:opacity-50"
                        />
                        <span>Time Slot 1 {station.duplex ? '' : '(Duplex only)'}</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={networks.dmrSlot2}
                          onChange={(e) => updateNetworks({ dmrSlot2: e.target.checked })}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span>Time Slot 2</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Additional Digital Voice Modes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800/70 space-y-3">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={networks.ysfEnable}
                      onChange={(e) => updateNetworks({ ysfEnable: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>Yaesu System Fusion (YSF)</span>
                  </label>
                  {networks.ysfEnable && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={networks.ysfGatewayHost}
                        onChange={(e) => updateNetworks({ ysfGatewayHost: e.target.value })}
                        placeholder="127.0.0.1"
                        aria-label="YSF Gateway Host"
                        className="min-h-[38px] px-2.5 py-1.5 text-xs font-mono rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                      />
                      <input
                        type="number"
                        value={networks.ysfGatewayPort}
                        onChange={(e) => updateNetworks({ ysfGatewayPort: Number(e.target.value) || 4200 })}
                        aria-label="YSF Gateway Port"
                        className="min-h-[38px] px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800/70 space-y-3">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={networks.dstarEnable}
                      onChange={(e) => updateNetworks({ dstarEnable: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>D-Star</span>
                  </label>
                  {networks.dstarEnable && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-blue-300">Module:</span>
                      <select
                        value={networks.dstarModule}
                        onChange={(e) => updateNetworks({ dstarModule: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                        aria-label="D-Star Module"
                        className="min-h-[36px] px-2.5 py-1 font-mono rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                      >
                        <option value="A">A (23cm)</option>
                        <option value="B">B (70cm)</option>
                        <option value="C">C (2m)</option>
                        <option value="D">D (Data)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800/70 space-y-3">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={networks.p25Enable}
                      onChange={(e) => updateNetworks({ p25Enable: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>P25 Digital</span>
                  </label>
                  {networks.p25Enable && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-blue-300">NAC (Hex):</span>
                      <input
                        type="text"
                        value={networks.p25Nac}
                        onChange={(e) => updateNetworks({ p25Nac: e.target.value.toUpperCase().slice(0, 3) })}
                        aria-label="P25 NAC"
                        className="w-24 min-h-[36px] px-2.5 py-1 font-mono rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800/70 space-y-3">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={networks.nxdnEnable}
                      onChange={(e) => updateNetworks({ nxdnEnable: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span>NXDN</span>
                  </label>
                  {networks.nxdnEnable && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-blue-300">RAN (0–63):</span>
                      <input
                        type="number"
                        min={0}
                        max={63}
                        value={networks.nxdnRan}
                        onChange={(e) => updateNetworks({ nxdnRan: Number(e.target.value) || 1 })}
                        aria-label="NXDN RAN"
                        className="w-24 min-h-[36px] px-2.5 py-1 font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================== ALLSTARLINK NODES TAB ======================== */}
        {activeTab === 'allstar-nodes' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-blue-100 dark:border-blue-800/70">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  AllStarLink 3 (ASL3 / Asterisk app_rpt)
                </h2>
                <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                  Configure your AllStarLink node registration, IAX2 port, radio driver, and multi-node stanzas separately from MMDVM and DVSwitch.
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allstar.enabled}
                  onChange={(e) => updateAllStar({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Enable AllStarLink 3</span>
              </label>
            </div>

            {allstar.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="asl-node" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Primary AllStarLink Node #
                    </label>
                    <input
                      id="asl-node"
                      type="text"
                      inputMode="numeric"
                      value={allstar.nodeNumber}
                      onChange={(e) => updateAllStar({ nodeNumber: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="20804"
                      className={`${INPUT_CLASS} font-mono tabular-nums`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="asl-pass" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Node Registration Password
                    </label>
                    <div className="relative">
                      <input
                        id="asl-pass"
                        type={showAslPass ? 'text' : 'password'}
                        value={allstar.nodePassword}
                        onChange={(e) => updateAllStar({ nodePassword: e.target.value })}
                        placeholder="AllStarLink Portal node password"
                        className={`${INPUT_CLASS} pr-10 font-mono`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAslPass((v) => !v)}
                        aria-label={showAslPass ? 'Hide AllStarLink password' : 'Show AllStarLink password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-blue-200"
                      >
                        {showAslPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="asl-callsign" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      AllStarLink Callsign
                    </label>
                    <input
                      id="asl-callsign"
                      type="text"
                      value={allstar.callsign}
                      onChange={(e) => updateAllStar({ callsign: e.target.value.toUpperCase() })}
                      placeholder="W7ABC"
                      className={`${INPUT_CLASS} font-mono uppercase`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="asl-iaxport" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      IAX2 UDP Port
                    </label>
                    <input
                      id="asl-iaxport"
                      type="number"
                      min={1024}
                      max={65535}
                      value={allstar.iaxPort}
                      onChange={(e) => updateAllStar({ iaxPort: Number(e.target.value) || 4569 })}
                      className={`${INPUT_CLASS} font-mono tabular-nums`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="asl-regserver" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Registration Server
                    </label>
                    <input
                      id="asl-regserver"
                      type="text"
                      value={allstar.registrationServer}
                      onChange={(e) => updateAllStar({ registrationServer: e.target.value })}
                      placeholder="register.allstarlink.org"
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="asl-iface" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Radio Interface Driver
                    </label>
                    <select
                      id="asl-iface"
                      value={allstar.radioInterface}
                      onChange={(e) => updateAllStar({ radioInterface: e.target.value as AslRadioInterface })}
                      className={INPUT_CLASS}
                    >
                      <option value="simpleusb">SimpleUSB (CM108 / Shari / RIM FOB)</option>
                      <option value="usbradio">USBRadio (DSP Squelch / CTCSS)</option>
                      <option value="pseudo">Pseudo (Hub / Radio-less Node)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="asl-duplex" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Duplex Mode
                    </label>
                    <select
                      id="asl-duplex"
                      value={allstar.duplexMode}
                      onChange={(e) => updateAllStar({ duplexMode: e.target.value as AslDuplexMode })}
                      className={INPUT_CLASS}
                    >
                      <option value="0">0 — Half Duplex (No Telemetry)</option>
                      <option value="1">1 — Half Duplex (Telemetry / Simplex Node)</option>
                      <option value="2">2 — Full Duplex (Repeater)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Local Nodes */}
                <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Additional Local Nodes on This Host
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                        Optionally host extra public or private AllStarLink node stanzas in /etc/asterisk/rpt.conf.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddExtraNode}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-xs font-semibold text-slate-800 dark:text-blue-100 inline-flex items-center gap-1.5 whitespace-nowrap self-start"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Local Node</span>
                    </button>
                  </div>

                  {allstar.additionalNodes.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-blue-300/75 py-2">
                      Single-node configuration active (Node {allstar.nodeNumber || '—'}).
                      {dvswitch.enabled && dvswitch.bridgeNodeNumber
                        ? ` Private DVSwitch USRP node ${dvswitch.bridgeNodeNumber} is added automatically.`
                        : ''}
                    </p>
                  ) : (
                    <div className="divide-y divide-blue-100 dark:divide-blue-800/70 border border-blue-200 dark:border-blue-800/70 rounded-lg">
                      {allstar.additionalNodes.map((extra, idx) => (
                        <div key={extra.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-2 space-y-1">
                            <label htmlFor={`extra-node-${idx}`} className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                              Node #
                            </label>
                            <input
                              id={`extra-node-${idx}`}
                              type="text"
                              inputMode="numeric"
                              value={extra.nodeNumber}
                              onChange={(e) =>
                                handleUpdateExtraNode(extra.id, {
                                  nodeNumber: e.target.value.replace(/\D/g, '').slice(0, 6),
                                })
                              }
                              placeholder="1998"
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                            />
                          </div>

                          <div className="md:col-span-3 space-y-1">
                            <label htmlFor={`extra-pw-${idx}`} className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                              Password (blank if private)
                            </label>
                            <input
                              id={`extra-pw-${idx}`}
                              type="password"
                              value={extra.nodePassword}
                              onChange={(e) => handleUpdateExtraNode(extra.id, { nodePassword: e.target.value })}
                              placeholder="Optional"
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-sm font-mono rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                            />
                          </div>

                          <div className="md:col-span-3 space-y-1">
                            <label htmlFor={`extra-if-${idx}`} className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                              Interface
                            </label>
                            <select
                              id={`extra-if-${idx}`}
                              value={extra.radioInterface}
                              onChange={(e) =>
                                handleUpdateExtraNode(extra.id, {
                                  radioInterface: e.target.value as AslRadioInterface,
                                })
                              }
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-xs rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                            >
                              <option value="pseudo">Pseudo (Hub / Private)</option>
                              <option value="simpleusb">SimpleUSB</option>
                              <option value="usbradio">USBRadio</option>
                            </select>
                          </div>

                          <div className="md:col-span-3 space-y-1">
                            <label htmlFor={`extra-dup-${idx}`} className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                              Duplex
                            </label>
                            <select
                              id={`extra-dup-${idx}`}
                              value={extra.duplexMode}
                              onChange={(e) =>
                                handleUpdateExtraNode(extra.id, {
                                  duplexMode: e.target.value as AslDuplexMode,
                                })
                              }
                              className="w-full min-h-[38px] px-2.5 py-1.5 text-xs rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                            >
                              <option value="0">0 — No Telemetry</option>
                              <option value="1">1 — Simplex Telemetry</option>
                              <option value="2">2 — Full Duplex</option>
                            </select>
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraNode(extra.id)}
                              aria-label={`Remove node ${extra.nodeNumber || idx + 1}`}
                              className="p-2 rounded-md border border-blue-200 dark:border-blue-800 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================== ALLSTARLINK RADIO & AMI TAB ======================== */}
        {activeTab === 'allstar-audio' && (
          <div className="space-y-8">
            {!allstar.enabled && (
              <div className="p-3.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-[#07162b] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 dark:text-blue-200">
                <span>AllStarLink 3 is currently disabled. Enable it on the AllStarLink Nodes tab to generate /etc/asterisk/*.conf.</span>
                <button
                  type="button"
                  onClick={() => {
                    updateAllStar({ enabled: true });
                    onTabChange('allstar-nodes');
                  }}
                  className="text-blue-700 dark:text-sky-400 font-semibold hover:underline whitespace-nowrap"
                >
                  Enable AllStarLink 3
                </button>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  SimpleUSB Radio Interface Signaling (/etc/asterisk/simpleusb.conf)
                </h2>
                <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                  Configure COS/CTCSS polarity, audio emphasis, and TX mixer routing for CM108 / SHARI / RIM USB sound interfaces.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="asl-carrier" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    Carrier Detect (COS)
                  </label>
                  <select
                    id="asl-carrier"
                    value={allstar.carrierFrom}
                    onChange={(e) =>
                      updateAllStar({ carrierFrom: e.target.value as MmdvmConfiguration['allstar']['carrierFrom'] })
                    }
                    className={`${INPUT_CLASS} font-mono`}
                  >
                    <option value="usbinvert">usbinvert (Active Low — SHARI / most radios)</option>
                    <option value="usb">usb (Active High)</option>
                    <option value="vox">vox (Audio VOX)</option>
                    <option value="no">no (Disabled)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="asl-ctcss" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    CTCSS Logic Input
                  </label>
                  <select
                    id="asl-ctcss"
                    value={allstar.ctcssFrom}
                    onChange={(e) =>
                      updateAllStar({ ctcssFrom: e.target.value as MmdvmConfiguration['allstar']['ctcssFrom'] })
                    }
                    className={`${INPUT_CLASS} font-mono`}
                  >
                    <option value="no">no (Radio handles tone squelch)</option>
                    <option value="usbinvert">usbinvert (Active Low)</option>
                    <option value="usb">usb (Active High)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="asl-txmix" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    TX Mix Channel A
                  </label>
                  <select
                    id="asl-txmix"
                    value={allstar.txMixA}
                    onChange={(e) =>
                      updateAllStar({ txMixA: e.target.value as MmdvmConfiguration['allstar']['txMixA'] })
                    }
                    className={`${INPUT_CLASS} font-mono`}
                  >
                    <option value="voice">voice (Standard)</option>
                    <option value="composite">composite (Voice + CTCSS)</option>
                    <option value="no">no (Muted)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allstar.rxBoost}
                    onChange={(e) => updateAllStar({ rxBoost: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>RX Boost (+20dB)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allstar.pttInvert}
                    onChange={(e) => updateAllStar({ pttInvert: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>Invert PTT</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allstar.plFilter}
                    onChange={(e) => updateAllStar({ plFilter: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>PL High-Pass Filter</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allstar.deEmphasis}
                    onChange={(e) => updateAllStar({ deEmphasis: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>RX De-emphasis</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allstar.preEmphasis}
                    onChange={(e) => updateAllStar({ preEmphasis: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span>TX Pre-emphasis</span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Asterisk Manager Interface (AMI) &amp; Allmon3
                </h2>
                <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                  Bound strictly to 127.0.0.1:5038 in /etc/asterisk/manager.conf (mode 0640) for local Allmon3 or monitoring tools.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="asl-ami-user" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    AMI Username
                  </label>
                  <input
                    id="asl-ami-user"
                    type="text"
                    value={allstar.amiUser}
                    onChange={(e) => updateAllStar({ amiUser: e.target.value })}
                    placeholder="admin"
                    className={`${INPUT_CLASS} font-mono`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="asl-ami-secret" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                    AMI Secret (min 8 chars)
                  </label>
                  <div className="relative">
                    <input
                      id="asl-ami-secret"
                      type={showAmiSecret ? 'text' : 'password'}
                      value={allstar.amiSecret}
                      onChange={(e) => updateAllStar({ amiSecret: e.target.value })}
                      placeholder="Set a strong local AMI password"
                      className={`${INPUT_CLASS} pr-10 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAmiSecret((v) => !v)}
                      aria-label={showAmiSecret ? 'Hide AMI secret' : 'Show AMI secret'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-blue-200"
                    >
                      {showAmiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allstar.installAllmon3}
                  onChange={(e) => updateAllStar({ installAllmon3: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Also install the Allmon3 package during full installation</span>
              </label>
            </div>
          </div>
        )}

        {/* ======================== DVSWITCH BRIDGE TAB ======================== */}
        {activeTab === 'dvswitch' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-blue-100 dark:border-blue-800/70">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  DVSwitch Server (Analog_Bridge + MMDVM_Bridge + md380-emu)
                </h2>
                <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                  Transcodes AllStarLink USRP audio directly to DMR, YSF, D-Star, P25, or NXDN networks.
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-white cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={dvswitch.enabled}
                  onChange={(e) => updateDvSwitch({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Enable DVSwitch Bridge</span>
              </label>
            </div>

            {dvswitch.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="dvs-node" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Private USRP Bridge Node #
                    </label>
                    <input
                      id="dvs-node"
                      type="text"
                      inputMode="numeric"
                      value={dvswitch.bridgeNodeNumber}
                      onChange={(e) => updateDvSwitch({ bridgeNodeNumber: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="1999"
                      className={`${INPUT_CLASS} font-mono tabular-nums`}
                    />
                    <p className="text-xs text-slate-500 dark:text-blue-300/70">
                      Auto-added to rpt.conf with USRP channel when ASL is enabled.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dvs-mode" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Default Digital Mode
                    </label>
                    <select
                      id="dvs-mode"
                      value={dvswitch.defaultMode}
                      onChange={(e) => updateDvSwitch({ defaultMode: e.target.value as DvSwitchMode })}
                      className={INPUT_CLASS}
                    >
                      <option value="DMR">DMR</option>
                      <option value="YSF">Yaesu System Fusion (YSF)</option>
                      <option value="DSTAR">D-Star</option>
                      <option value="P25">P25</option>
                      <option value="NXDN">NXDN</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dvs-dmrid" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Gateway DMR ID (7 digits)
                    </label>
                    <input
                      id="dvs-dmrid"
                      type="text"
                      inputMode="numeric"
                      value={dvswitch.dmrId}
                      onChange={(e) => updateDvSwitch({ dmrId: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                      placeholder="3100000"
                      className={`${INPUT_CLASS} font-mono tabular-nums`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dvs-repid" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                      Repeater / ESSID ID (9 digits)
                    </label>
                    <input
                      id="dvs-repid"
                      type="text"
                      inputMode="numeric"
                      value={dvswitch.repeaterId}
                      onChange={(e) => updateDvSwitch({ repeaterId: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                      placeholder="310000099"
                      className={`${INPUT_CLASS} font-mono tabular-nums`}
                    />
                    <p className="text-xs text-slate-500 dark:text-blue-300/70">
                      Use a distinct ESSID suffix from MMDVMHost (e.g. 99).
                    </p>
                  </div>
                </div>

                {/* DMR Master Credentials for MMDVM_Bridge */}
                <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      MMDVM_Bridge Master Server &amp; Startup Talkgroup
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-blue-300/75 mt-0.5">
                      Written to /opt/MMDVM_Bridge/MMDVM_Bridge.ini (mode 0640) and /opt/Analog_Bridge/Analog_Bridge.ini.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="dvs-preset" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Master Preset
                      </label>
                      <select
                        id="dvs-preset"
                        value={selectedDvsMasterPreset}
                        onChange={(e) => handleDvsMasterPresetChange(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        {DMR_MASTER_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-host" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        DMR Master Host
                      </label>
                      <input
                        id="dvs-host"
                        type="text"
                        value={dvswitch.dmrMasterHost}
                        onChange={(e) => updateDvSwitch({ dmrMasterHost: e.target.value })}
                        placeholder="3102.repeater.net"
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-port" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Master UDP Port
                      </label>
                      <input
                        id="dvs-port"
                        type="number"
                        min={1024}
                        max={65535}
                        value={dvswitch.dmrMasterPort}
                        onChange={(e) => updateDvSwitch({ dmrMasterPort: Number(e.target.value) || 62031 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-tg" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Default Talkgroup (txTg)
                      </label>
                      <input
                        id="dvs-tg"
                        type="text"
                        inputMode="numeric"
                        value={dvswitch.defaultTalkgroup}
                        onChange={(e) => updateDvSwitch({ defaultTalkgroup: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                        placeholder="3100"
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="dvs-pass" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        Hotspot Security Password
                      </label>
                      <div className="relative">
                        <input
                          id="dvs-pass"
                          type={showDvsPass ? 'text' : 'password'}
                          value={dvswitch.dmrMasterPassword}
                          onChange={(e) => updateDvSwitch({ dmrMasterPassword: e.target.value })}
                          placeholder="BrandMeister SelfCare password"
                          className={`${INPUT_CLASS} pr-10 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowDvsPass((v) => !v)}
                          aria-label={showDvsPass ? 'Hide DVSwitch password' : 'Show DVSwitch password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-blue-200"
                        >
                          {showDvsPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-ambe" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        AMBE Vocoder Engine
                      </label>
                      <select
                        id="dvs-ambe"
                        value={dvswitch.ambeMode}
                        onChange={(e) => updateDvSwitch({ ambeMode: e.target.value as 'md380-emu' | 'thumbdv' })}
                        className={INPUT_CLASS}
                      >
                        <option value="md380-emu">md380-emu (Software Emulator — 127.0.0.1:2470)</option>
                        <option value="thumbdv">ThumbDV / DV3000 USB Hardware (/dev/ttyUSB0)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* USRP / TLV Port & Audio Gain Tuning */}
                <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    USRP Ports, TLV Ports &amp; Bridge Audio Gains
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="dvs-usrphost" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        USRP Host
                      </label>
                      <input
                        id="dvs-usrphost"
                        type="text"
                        value={dvswitch.usrpHost}
                        onChange={(e) => updateDvSwitch({ usrpHost: e.target.value })}
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-usrptx" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        USRP TX Port
                      </label>
                      <input
                        id="dvs-usrptx"
                        type="number"
                        min={1024}
                        max={65535}
                        value={dvswitch.usrpTxPort}
                        onChange={(e) => updateDvSwitch({ usrpTxPort: Number(e.target.value) || 34001 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-usrprx" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        USRP RX Port
                      </label>
                      <input
                        id="dvs-usrprx"
                        type="number"
                        min={1024}
                        max={65535}
                        value={dvswitch.usrpRxPort}
                        onChange={(e) => updateDvSwitch({ usrpRxPort: Number(e.target.value) || 32001 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-usrpgain" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        USRP Gain
                      </label>
                      <input
                        id="dvs-usrpgain"
                        type="number"
                        step="0.05"
                        min={0.05}
                        max={5}
                        value={dvswitch.usrpGain}
                        onChange={(e) => updateDvSwitch({ usrpGain: Number(e.target.value) || 0.35 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="dvs-tlvgain" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                        TLV Gain
                      </label>
                      <input
                        id="dvs-tlvgain"
                        type="number"
                        step="0.05"
                        min={0.05}
                        max={5}
                        value={dvswitch.tlvGain}
                        onChange={(e) => updateDvSwitch({ tlvGain: Number(e.target.value) || 0.35 })}
                        className={`${INPUT_CLASS} font-mono tabular-nums`}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================== SYSTEM & ACCOUNT TAB ======================== */}
        {activeTab === 'system' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="cfg-hostname" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  Linux Hostname
                </label>
                <input
                  id="cfg-hostname"
                  type="text"
                  value={system.hostname}
                  onChange={(e) => updateSystem({ hostname: e.target.value })}
                  className={`${INPUT_CLASS} font-mono`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-tz" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  Timezone
                </label>
                <select
                  id="cfg-tz"
                  value={system.timezone}
                  onChange={(e) => updateSystem({ timezone: e.target.value })}
                  className={INPUT_CLASS}
                >
                  {Array.from(new Set([...COMMON_TIMEZONES, system.timezone])).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cfg-webport" className="block text-sm font-medium text-slate-800 dark:text-blue-100">
                  WebGUI Port
                </label>
                <input
                  id="cfg-webport"
                  type="number"
                  min={1024}
                  max={65535}
                  value={system.webguiPort}
                  onChange={(e) => updateSystem({ webguiPort: Number(e.target.value) || 8080 })}
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-blue-100 dark:border-blue-800/70 flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2.5 text-sm text-slate-800 dark:text-blue-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={system.enableUfw}
                  onChange={(e) => updateSystem({ enableUfw: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span>Configure UFW Firewall during full install (SSH, WebGUI, IAX2)</span>
              </label>

              {system.enableUfw && (
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="cfg-sshport" className="text-slate-600 dark:text-blue-300">
                    SSH Port:
                  </label>
                  <input
                    id="cfg-sshport"
                    type="number"
                    min={1}
                    max={65535}
                    value={system.sshPort}
                    onChange={(e) => updateSystem({ sshPort: Number(e.target.value) || 22 })}
                    className="w-24 min-h-[36px] px-2.5 py-1 text-sm font-mono tabular-nums rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                  />
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-blue-100 dark:border-blue-800/70 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-sky-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Administrator Login Password ({localNode.username})
                </h2>
              </div>

              {localNode.envManaged ? (
                <p className="text-xs text-slate-500 dark:text-blue-300/75">
                  Password is managed by the server&apos;s <span className="font-mono">MMDVM_WEBGUI_ADMIN_PASSWORD</span> environment variable.
                </p>
              ) : (
                <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label htmlFor="pw-cur" className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                      Current Password
                    </label>
                    <input
                      id="pw-cur"
                      type="password"
                      value={curPw}
                      onChange={(e) => setCurPw(e.target.value)}
                      required
                      className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="pw-new" className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                      New Password (min 8)
                    </label>
                    <input
                      id="pw-new"
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                      className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="pw-conf" className="block text-xs font-medium text-slate-600 dark:text-blue-300">
                      Confirm New Password
                    </label>
                    <input
                      id="pw-conf"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                      className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#07162b]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pwBusy}
                    className="min-h-[38px] px-4 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                  >
                    {pwBusy ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}

              {pwStatus && (
                <p
                  className={`text-xs ${
                    pwStatus.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {pwStatus.text}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="text-xs text-slate-600 dark:text-blue-200/80 space-y-0.5">
          <p className="font-medium text-slate-900 dark:text-white">
            {errors.length > 0
              ? `${errors.length} validation error${errors.length === 1 ? '' : 's'} must be fixed before applying.`
              : hasUnsavedChanges
                ? 'Unsaved edits ready to apply to /etc/asterisk/*.conf, /opt/*_Bridge/*.ini, and /etc/mmdvm/*.ini.'
                : warnings.length > 0
                  ? `Configuration valid with ${warnings.length} advisory note${warnings.length === 1 ? '' : 's'}.`
                  : 'Configuration validated and ready.'}
          </p>
          <p>
            Applying edits backs up existing config files and reloads configured services without reinstalling packages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={errors.length > 0 || isRunningJob}
            onClick={onApplyConfig}
            className="min-h-[42px] px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            {isRunningJob ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasUnsavedChanges ? (
              <Save className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Apply Config Files (No Reinstall)</span>
          </button>

          {!anyInstalled && (
            <button
              type="button"
              onClick={() => onNavigate('installer')}
              className="min-h-[42px] px-4 py-2 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-800 dark:text-blue-100 text-sm font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span>Go to Installer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
