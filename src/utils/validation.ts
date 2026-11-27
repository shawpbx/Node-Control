import { MmdvmConfiguration, ValidationIssue } from '../types/mmdvmConfig';

export function mhzToHz(mhzRaw: string): number | null {
  const cleaned = mhzRaw.trim();
  if (!cleaned) return null;
  const val = Number(cleaned);
  if (!Number.isFinite(val) || val <= 0) return null;
  return Math.round(val * 1_000_000);
}

export function validateMmdvmConfig(
  config: MmdvmConfiguration,
  detectedPorts?: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { station, modem, networks, allstar, dvswitch, system } = config;

  if (!modem.enabled && !allstar.enabled && !dvswitch.enabled) {
    issues.push({
      id: 'nothing-enabled',
      tab: 'station',
      field: 'enabled',
      severity: 'error',
      message: 'Enable at least one service (MMDVMHost, AllStarLink 3, or DVSwitch) to generate and apply configurations.',
    });
  }

  // MMDVM Station, Modem & Network validation
  if (modem.enabled) {
    const call = station.callsign.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(call)) {
      issues.push({
        id: 'callsign-invalid',
        tab: 'station',
        field: 'callsign',
        severity: 'error',
        message: 'MMDVM Callsign must be 3–10 alphanumeric characters (for example, W7ABC).',
      });
    } else if (call === 'N0CALL') {
      issues.push({
        id: 'callsign-placeholder',
        tab: 'station',
        field: 'callsign',
        severity: 'warning',
        message: 'Replace the placeholder MMDVM callsign N0CALL with your licensed callsign before transmitting.',
      });
    }

    if (networks.dmrEnable && !/^\d{6,7}$/.test(station.dmrId.trim())) {
      issues.push({
        id: 'dmr-id-invalid',
        tab: 'station',
        field: 'dmrId',
        severity: 'error',
        message: 'DMR ID must be a 6- or 7-digit RadioID number when DMR is enabled.',
      });
    }

    if (station.essidSuffix.trim() && !/^\d{2}$/.test(station.essidSuffix.trim())) {
      issues.push({
        id: 'essid-invalid',
        tab: 'station',
        field: 'essidSuffix',
        severity: 'error',
        message: 'ESSID suffix must be 2 digits (for example, 01) or blank.',
      });
    }

    const rxHz = mhzToHz(station.rxFrequencyMhz);
    const txHz = mhzToHz(station.txFrequencyMhz);
    if (rxHz == null || rxHz < 144_000_000 || rxHz > 450_000_000) {
      issues.push({
        id: 'rx-freq-invalid',
        tab: 'station',
        field: 'rxFrequencyMhz',
        severity: 'error',
        message: 'RX Frequency must be within VHF/UHF amateur range (144.0000 – 450.0000 MHz).',
      });
    }
    if (txHz == null || txHz < 144_000_000 || txHz > 450_000_000) {
      issues.push({
        id: 'tx-freq-invalid',
        tab: 'station',
        field: 'txFrequencyMhz',
        severity: 'error',
        message: 'TX Frequency must be within VHF/UHF amateur range (144.0000 – 450.0000 MHz).',
      });
    }
    if (!station.duplex && rxHz != null && txHz != null && rxHz !== txHz) {
      issues.push({
        id: 'simplex-split-warning',
        tab: 'station',
        field: 'txFrequencyMhz',
        severity: 'warning',
        message: 'Simplex mode normally uses identical RX and TX frequencies. Enable Duplex for split operation.',
      });
    }

    if (station.rfPower < 1 || station.rfPower > 100) {
      issues.push({
        id: 'rf-power-invalid',
        tab: 'station',
        field: 'rfPower',
        severity: 'error',
        message: 'RF Level must be between 1% and 100%.',
      });
    }

    const port = modem.uartPort.trim();
    if (modem.protocol === 'uart') {
      if (!/^\/dev\/[A-Za-z0-9._-]+$/.test(port)) {
        issues.push({
          id: 'uart-port-invalid',
          tab: 'modem',
          field: 'uartPort',
          severity: 'error',
          message: 'Serial UART port must be a valid /dev/ device path (for example, /dev/ttyAMA0 or /dev/ttyACM0).',
        });
      } else if (detectedPorts && detectedPorts.length > 0 && !detectedPorts.includes(port)) {
        issues.push({
          id: 'uart-port-missing',
          tab: 'modem',
          field: 'uartPort',
          severity: 'warning',
          message: `${port} was not detected on this host. Detected ports: ${detectedPorts.join(', ')}.`,
        });
      } else if (detectedPorts && detectedPorts.length === 0) {
        issues.push({
          id: 'no-ports-detected',
          tab: 'modem',
          field: 'uartPort',
          severity: 'warning',
          message: 'No serial devices were detected yet. Enable Raspberry Pi GPIO UART or choose Null Modem to test without hardware.',
        });
      }
    }

    if (![115200, 230400, 460800].includes(modem.uartSpeed)) {
      issues.push({
        id: 'uart-speed-invalid',
        tab: 'modem',
        field: 'uartSpeed',
        severity: 'error',
        message: 'UART baud rate must be 115200, 230400, or 460800.',
      });
    }

    const anyMode =
      networks.dmrEnable ||
      networks.ysfEnable ||
      networks.dstarEnable ||
      networks.p25Enable ||
      networks.nxdnEnable;

    if (!anyMode) {
      issues.push({
        id: 'no-modes-enabled',
        tab: 'networks',
        field: 'dmrEnable',
        severity: 'error',
        message: 'Enable at least one MMDVM digital voice mode (DMR, YSF, D-Star, P25, or NXDN).',
      });
    }

    if (networks.dmrEnable) {
      if (!/^[a-zA-Z0-9.-]+$/.test(networks.dmrMasterHost.trim())) {
        issues.push({
          id: 'dmr-host-invalid',
          tab: 'networks',
          field: 'dmrMasterHost',
          severity: 'error',
          message: 'Enter a valid DMR master hostname or IP address (for example, 3102.repeater.net).',
        });
      }
      if (networks.dmrMasterPort < 1024 || networks.dmrMasterPort > 65535) {
        issues.push({
          id: 'dmr-port-invalid',
          tab: 'networks',
          field: 'dmrMasterPort',
          severity: 'error',
          message: 'DMR master port must be between 1024 and 65535 (usually 62031).',
        });
      }
      if (!networks.dmrMasterPassword.trim()) {
        issues.push({
          id: 'dmr-pass-missing',
          tab: 'networks',
          field: 'dmrMasterPassword',
          severity: 'warning',
          message: 'Enter your BrandMeister Hotspot Security password (or network password) so DMRGateway can authenticate.',
        });
      }
      if (networks.dmrColorCode < 0 || networks.dmrColorCode > 15) {
        issues.push({
          id: 'dmr-cc-invalid',
          tab: 'networks',
          field: 'dmrColorCode',
          severity: 'error',
          message: 'DMR Color Code must be between 0 and 15.',
        });
      }
    }

    if (networks.p25Enable && !/^[0-9A-Fa-f]{1,3}$/.test(networks.p25Nac.trim())) {
      issues.push({
        id: 'p25-nac-invalid',
        tab: 'networks',
        field: 'p25Nac',
        severity: 'error',
        message: 'P25 NAC must be a valid hex value (default 293).',
      });
    }
  }

  // AllStarLink validation
  if (allstar.enabled) {
    const aslCall = allstar.callsign.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(aslCall)) {
      issues.push({
        id: 'asl-callsign-invalid',
        tab: 'allstar-nodes',
        field: 'callsign',
        severity: 'error',
        message: 'AllStarLink callsign must be 3–10 alphanumeric characters.',
      });
    } else if (aslCall === 'N0CALL') {
      issues.push({
        id: 'asl-callsign-placeholder',
        tab: 'allstar-nodes',
        field: 'callsign',
        severity: 'warning',
        message: 'Replace placeholder AllStarLink callsign N0CALL with your licensed callsign.',
      });
    }

    const primaryNode = allstar.nodeNumber.trim();
    if (!/^\d{4,6}$/.test(primaryNode)) {
      issues.push({
        id: 'asl-node-invalid',
        tab: 'allstar-nodes',
        field: 'nodeNumber',
        severity: 'error',
        message: 'Primary AllStarLink node number must be 4–6 digits.',
      });
    }

    if (!allstar.nodePassword.trim()) {
      issues.push({
        id: 'asl-pass-missing',
        tab: 'allstar-nodes',
        field: 'nodePassword',
        severity: 'warning',
        message: 'Enter your AllStarLink portal node password so IAX2 registration succeeds.',
      });
    }

    if (allstar.iaxPort < 1024 || allstar.iaxPort > 65535) {
      issues.push({
        id: 'asl-iaxport-invalid',
        tab: 'allstar-nodes',
        field: 'iaxPort',
        severity: 'error',
        message: 'IAX2 port must be between 1024 and 65535 (default 4569).',
      });
    }

    if (!/^[a-zA-Z0-9.-]+$/.test(allstar.registrationServer.trim())) {
      issues.push({
        id: 'asl-reg-invalid',
        tab: 'allstar-nodes',
        field: 'registrationServer',
        severity: 'error',
        message: 'Registration server must be a valid hostname (default register.allstarlink.org).',
      });
    }

    const seenNodes = new Set<string>(primaryNode ? [primaryNode] : []);
    for (const extra of allstar.additionalNodes) {
      const n = extra.nodeNumber.trim();
      if (!/^\d{4,6}$/.test(n)) {
        issues.push({
          id: `asl-extra-node-${extra.id}`,
          tab: 'allstar-nodes',
          field: 'additionalNodes',
          severity: 'error',
          message: `Additional AllStarLink node "${n || '(blank)'}" must be 4–6 digits.`,
        });
      } else if (seenNodes.has(n)) {
        issues.push({
          id: `asl-dup-node-${extra.id}`,
          tab: 'allstar-nodes',
          field: 'additionalNodes',
          severity: 'error',
          message: `Duplicate AllStarLink node number ${n}. Each local node must be unique.`,
        });
      } else {
        seenNodes.add(n);
      }
    }

    if (!/^[a-zA-Z0-9._-]{2,32}$/.test(allstar.amiUser.trim())) {
      issues.push({
        id: 'asl-ami-user',
        tab: 'allstar-audio',
        field: 'amiUser',
        severity: 'error',
        message: 'AMI username must be 2–32 alphanumeric/dot/underscore/hyphen characters.',
      });
    }
    if (!allstar.amiSecret.trim()) {
      issues.push({
        id: 'asl-ami-secret',
        tab: 'allstar-audio',
        field: 'amiSecret',
        severity: 'warning',
        message: 'Set an Asterisk Manager Interface (AMI) secret if you plan to use Allmon3 or Supermon.',
      });
    }
  }

  // DVSwitch Bridge validation
  if (dvswitch.enabled) {
    const bridgeNode = dvswitch.bridgeNodeNumber.trim();
    if (bridgeNode && !/^\d{4,6}$/.test(bridgeNode)) {
      issues.push({
        id: 'dvs-bridge-node',
        tab: 'dvswitch',
        field: 'bridgeNodeNumber',
        severity: 'error',
        message: 'DVSwitch private USRP bridge node number must be 4–6 digits (for example, 1999) or blank.',
      });
    }
    if (!/^[a-zA-Z0-9.-]+$/.test(dvswitch.usrpHost.trim())) {
      issues.push({
        id: 'dvs-usrp-host',
        tab: 'dvswitch',
        field: 'usrpHost',
        severity: 'error',
        message: 'USRP host must be a valid IP address or hostname (default 127.0.0.1).',
      });
    }
    if (
      dvswitch.usrpTxPort < 1024 ||
      dvswitch.usrpTxPort > 65535 ||
      dvswitch.usrpRxPort < 1024 ||
      dvswitch.usrpRxPort > 65535
    ) {
      issues.push({
        id: 'dvs-usrp-ports',
        tab: 'dvswitch',
        field: 'usrpTxPort',
        severity: 'error',
        message: 'USRP TX and RX ports must be between 1024 and 65535 (defaults 34001 / 32001).',
      });
    }
    if (!/^\d{6,7}$/.test(dvswitch.dmrId.trim())) {
      issues.push({
        id: 'dvs-dmr-id',
        tab: 'dvswitch',
        field: 'dmrId',
        severity: 'error',
        message: 'DVSwitch DMR ID must be a 6- or 7-digit RadioID number.',
      });
    }
    if (!/^\d{7,9}$/.test(dvswitch.repeaterId.trim())) {
      issues.push({
        id: 'dvs-repeater-id',
        tab: 'dvswitch',
        field: 'repeaterId',
        severity: 'error',
        message: 'DVSwitch Repeater / ESSID DMR ID must be 7–9 digits (for example, 310123499).',
      });
    }
    if (!/^\d{1,8}$/.test(dvswitch.defaultTalkgroup.trim())) {
      issues.push({
        id: 'dvs-tg',
        tab: 'dvswitch',
        field: 'defaultTalkgroup',
        severity: 'error',
        message: 'Default DVSwitch talkgroup must be numeric (for example, 3100 or 91).',
      });
    }
    if (!/^[a-zA-Z0-9.-]+$/.test(dvswitch.dmrMasterHost.trim())) {
      issues.push({
        id: 'dvs-master-host',
        tab: 'dvswitch',
        field: 'dmrMasterHost',
        severity: 'error',
        message: 'DVSwitch DMR Master host must be a valid hostname or IP address.',
      });
    }
    if (dvswitch.dmrMasterPort < 1024 || dvswitch.dmrMasterPort > 65535) {
      issues.push({
        id: 'dvs-master-port',
        tab: 'dvswitch',
        field: 'dmrMasterPort',
        severity: 'error',
        message: 'DVSwitch DMR Master port must be between 1024 and 65535.',
      });
    }
    if (!dvswitch.dmrMasterPassword.trim()) {
      issues.push({
        id: 'dvs-master-pass',
        tab: 'dvswitch',
        field: 'dmrMasterPassword',
        severity: 'warning',
        message: 'Enter your BrandMeister / DMR master hotspot security password for MMDVM_Bridge.',
      });
    }
  }

  // System validation
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,62}$/.test(system.hostname.trim())) {
    issues.push({
      id: 'hostname-invalid',
      tab: 'system',
      field: 'hostname',
      severity: 'error',
      message: 'Hostname may only contain letters, digits, and hyphens.',
    });
  }
  if (system.webguiPort < 1024 || system.webguiPort > 65535) {
    issues.push({
      id: 'webgui-port-invalid',
      tab: 'system',
      field: 'webguiPort',
      severity: 'error',
      message: 'WebGUI port must be between 1024 and 65535.',
    });
  }
  if (system.sshPort < 1 || system.sshPort > 65535) {
    issues.push({
      id: 'ssh-port-invalid',
      tab: 'system',
      field: 'sshPort',
      severity: 'error',
      message: 'SSH port must be between 1 and 65535.',
    });
  }

  return issues;
}
