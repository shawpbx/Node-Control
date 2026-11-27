import { Pause, Play, RefreshCw, RotateCw, Square } from 'lucide-react';
import { ConfigTab, MmdvmConfiguration, WorkspaceView } from '../types/mmdvmConfig';
import { LocalNodeController, ServiceAction, ServiceUnit } from '../hooks/useLocalNode';

interface ServicesLogsViewProps {
  config: MmdvmConfiguration;
  localNode: LocalNodeController;
  onNavigate: (view: WorkspaceView, tab?: ConfigTab) => void;
}

function statusMeta(state: string | undefined): { label: string; color: string } {
  if (state === 'active') return { label: 'Running', color: 'text-emerald-700 dark:text-emerald-400' };
  if (state === 'activating') return { label: 'Starting', color: 'text-amber-700 dark:text-amber-400' };
  if (state === 'failed') return { label: 'Failed', color: 'text-red-700 dark:text-red-400' };
  return { label: 'Stopped', color: 'text-slate-500 dark:text-blue-300/70' };
}

export function ServicesLogsView({ config, localNode, onNavigate }: ServicesLogsViewProps) {
  const aslState = localNode.services.asterisk || 'inactive';
  const mmdvmState = localNode.services.mmdvmhost || 'inactive';
  const gwState = localNode.services.dmrgateway || 'inactive';
  const allmonState = localNode.services.allmon3 || 'inactive';
  const abState = localNode.services.analog_bridge || 'inactive';
  const mbState = localNode.services.mmdvm_bridge || 'inactive';
  const emuState = localNode.services['md380-emu'] || 'inactive';

  const serviceRows: { unit: ServiceUnit; label: string; desc: string; state: string; editTab: ConfigTab }[] = [
    ...(config.allstar.enabled || localNode.installed.asterisk
      ? [
          {
            unit: 'asterisk' as ServiceUnit,
            label: 'asterisk.service',
            desc: 'AllStarLink 3 PBX / app_rpt',
            state: aslState,
            editTab: 'allstar-nodes' as ConfigTab,
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
            editTab: 'dvswitch' as ConfigTab,
          },
          {
            unit: 'mmdvm_bridge' as ServiceUnit,
            label: 'mmdvm_bridge.service',
            desc: 'DVSwitch Digital Voice Bridge',
            state: mbState,
            editTab: 'dvswitch' as ConfigTab,
          },
          {
            unit: 'md380-emu' as ServiceUnit,
            label: 'md380-emu.service',
            desc: 'Software AMBE Vocoder',
            state: emuState,
            editTab: 'dvswitch' as ConfigTab,
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
            editTab: 'modem' as ConfigTab,
          },
          {
            unit: 'dmrgateway' as ServiceUnit,
            label: 'dmrgateway.service',
            desc: 'DMR Master Authentication Bridge',
            state: gwState,
            editTab: 'networks' as ConfigTab,
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
            editTab: 'allstar-audio' as ConfigTab,
          },
        ]
      : []),
  ];

  const logUnits: ServiceUnit[] = ['asterisk', 'analog_bridge', 'mmdvm_bridge', 'mmdvmhost', 'dmrgateway'];

  const handleServiceAction = async (unit: ServiceUnit, action: ServiceAction) => {
    await localNode.controlService(unit, action);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Service Controls &amp; Live Logs
          </h1>
          <p className="text-sm text-slate-700 dark:text-blue-200/80 mt-0.5">
            Start, restart, or stop AllStarLink, DVSwitch, and MMDVM daemons and inspect live logs from /var/log/mmdvm/ and systemd.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Service Controls */}
        <section className="lg:col-span-5 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Service Controls
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('configurator', 'modem')}
              className="text-xs font-medium text-blue-700 dark:text-sky-400 hover:underline whitespace-nowrap"
            >
              Configurator
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-medium text-slate-900 dark:text-white truncate">
                        {svc.label}
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate('configurator', svc.editTab)}
                        className="text-[11px] font-medium text-blue-700 dark:text-sky-400 hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    </div>
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
        </section>

        {/* Right: Live Service Logs */}
        <section className="lg:col-span-7 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Live Service Logs
              </h2>
              <p className="text-xs text-slate-500 dark:text-blue-300/75 font-mono">
                {localNode.logsUnit === 'mmdvmhost'
                  ? '/var/log/mmdvm/MMDVMHost.log'
                  : localNode.logsUnit === 'dmrgateway'
                    ? '/var/log/mmdvm/DMRGateway.log'
                    : localNode.logsUnit === 'mmdvm_bridge'
                      ? '/var/log/mmdvm/MMDVM_Bridge-*.log'
                      : `journalctl -u ${localNode.logsUnit}.service`}
              </p>
            </div>

            <button
              type="button"
              disabled={localNode.logsLoading}
              onClick={() => localNode.refreshLogs()}
              className="min-h-[34px] px-3 py-1 rounded-md border border-blue-200 dark:border-blue-800 text-xs font-medium text-slate-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${localNode.logsLoading ? 'animate-spin' : ''}`} />
              <span>Reload Logs</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-blue-50 dark:bg-[#07162b] border border-blue-200/80 dark:border-blue-800 rounded-md overflow-x-auto w-fit max-w-full">
            {logUnits.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => localNode.setLogsUnit(u)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap ${
                  localNode.logsUnit === u
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-blue-200 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <pre className="h-[440px] overflow-auto rounded-md bg-[#061224] text-blue-100 p-3.5 text-xs leading-relaxed font-mono border border-blue-900/70">
            {localNode.serviceLogs.length > 0
              ? localNode.serviceLogs.join('\n')
              : `No log lines returned for ${localNode.logsUnit}.service yet.`}
          </pre>
        </section>
      </div>
    </div>
  );
}
