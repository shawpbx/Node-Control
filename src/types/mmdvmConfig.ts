export type WorkspaceView = 'dashboard' | 'services' | 'configurator' | 'installer' | 'files';

export type ConfigTab =
  | 'station'
  | 'modem'
  | 'networks'
  | 'allstar-nodes'
  | 'allstar-audio'
  | 'dvswitch'
  | 'system';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  tab: ConfigTab;
  field: string;
  severity: ValidationSeverity;
  message: string;
}

export interface StationConfig {
  callsign: string;
  dmrId: string;
  essidSuffix: string;
  duplex: boolean;
  rxFrequencyMhz: string;
  txFrequencyMhz: string;
  rxOffset: number;
  txOffset: number;
  rfPower: number;
  cwIdEnable: boolean;
  cwIdTimeMinutes: number;
  latitude: string;
  longitude: string;
  heightMeters: number;
  location: string;
  description: string;
  url: string;
}

export interface ModemConfig {
  enabled: boolean;
  modemModel: string;
  protocol: 'uart' | 'null';
  uartPort: string;
  uartSpeed: number;
  rxInvert: boolean;
  txInvert: boolean;
  pttInvert: boolean;
  txDelay: number;
  dmrDelay: number;
  rxLevel: number;
  txLevel: number;
  configurePiUart: boolean;
}

export interface NetworksConfig {
  dmrEnable: boolean;
  dmrColorCode: number;
  dmrMasterName: string;
  dmrMasterHost: string;
  dmrMasterPort: number;
  dmrMasterPassword: string;
  dmrSlot1: boolean;
  dmrSlot2: boolean;
  ysfEnable: boolean;
  ysfGatewayHost: string;
  ysfGatewayPort: number;
  dstarEnable: boolean;
  dstarModule: 'A' | 'B' | 'C' | 'D';
  p25Enable: boolean;
  p25Nac: string;
  nxdnEnable: boolean;
  nxdnRan: number;
}

export type AslRadioInterface = 'simpleusb' | 'usbradio' | 'pseudo';
export type AslDuplexMode = '0' | '1' | '2';

export interface ExtraAllStarNode {
  id: string;
  nodeNumber: string;
  nodePassword: string;
  radioInterface: AslRadioInterface;
  duplexMode: AslDuplexMode;
}

export interface AllStarConfig {
  enabled: boolean;
  nodeNumber: string;
  nodePassword: string;
  callsign: string;
  iaxPort: number;
  registrationServer: string;
  radioInterface: AslRadioInterface;
  duplexMode: AslDuplexMode;
  additionalNodes: ExtraAllStarNode[];
  // SimpleUSB FOB audio & hardware signaling
  carrierFrom: 'usbinvert' | 'usb' | 'vox' | 'no';
  ctcssFrom: 'no' | 'usb' | 'usbinvert';
  rxBoost: boolean;
  pttInvert: boolean;
  plFilter: boolean;
  deEmphasis: boolean;
  preEmphasis: boolean;
  txMixA: 'voice' | 'composite' | 'no';
  // Asterisk Manager Interface (AMI) & Allmon3
  amiUser: string;
  amiSecret: string;
  installAllmon3: boolean;
}

export type DvSwitchMode = 'DMR' | 'YSF' | 'DSTAR' | 'P25' | 'NXDN';

export interface DvSwitchConfig {
  enabled: boolean;
  bridgeNodeNumber: string;
  usrpHost: string;
  usrpTxPort: number;
  usrpRxPort: number;
  defaultMode: DvSwitchMode;
  dmrId: string;
  repeaterId: string;
  defaultTalkgroup: string;
  dmrMasterHost: string;
  dmrMasterPort: number;
  dmrMasterPassword: string;
  ambeMode: 'md380-emu' | 'thumbdv';
  tlvTxPort: number;
  tlvRxPort: number;
  usrpGain: number;
  tlvGain: number;
}

export interface SystemConfig {
  hostname: string;
  timezone: string;
  webguiPort: number;
  enableUfw: boolean;
  sshPort: number;
}

export interface MmdvmConfiguration {
  station: StationConfig;
  modem: ModemConfig;
  networks: NetworksConfig;
  allstar: AllStarConfig;
  dvswitch: DvSwitchConfig;
  system: SystemConfig;
}

export interface ModemPreset {
  id: string;
  label: string;
  category: 'GPIO Hotspot' | 'USB Hotspot' | 'Repeater Board' | 'Testing / Custom';
  protocol: 'uart' | 'null';
  uartPort: string;
  uartSpeed: number;
  duplex: boolean;
  rxInvert: boolean;
  txInvert: boolean;
  pttInvert: boolean;
  txDelay: number;
  dmrDelay: number;
  rxLevel: number;
  txLevel: number;
  configurePiUart: boolean;
  notes: string;
}

export interface DmrMasterPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  region: string;
}

export interface GeneratedFile {
  id: string;
  filename: string;
  targetPath: string;
  language: 'ini' | 'bash' | 'systemd';
  category: 'MMDVM' | 'AllStarLink' | 'DVSwitch' | 'Installer';
  description: string;
  content: string;
}
