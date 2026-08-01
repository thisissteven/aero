export const REACT_SCAN_ADDON_ID = 'aero-react-scan-addon';
export const REACT_SCAN_GLOBAL_TYPE_ID = 'aero-react-scan';
export const REACT_SCAN_PARAM_KEY = 'aero-react-scan';

export const REACT_SCAN_VALUES = ['true', 'false'] as const;

export const DEFAULT_REACT_SCAN: ReactScanKey = 'false';

export const REACT_SCAN_STORAGE_KEY = 'react-scan-options';

export type ReactScanKey = (typeof REACT_SCAN_VALUES)[number];
