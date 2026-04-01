
// helper that reads a field from the persisted `scaleConfig` object saved by
// the settings dialog. we guard against server execution and JSON errors.
function readSaved(field: string): any {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const saved = localStorage.getItem('scaleConfig');
    if (saved) {
      const obj = JSON.parse(saved);
      return obj[field];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export const SCALE_CONFIG = {
  tcpHost: readSaved('tcpHost') || '192.168.18.13',
  tcpPort: readSaved('tcpPort') || 8080,
  httpUrl: readSaved('httpUrl') || 'http://192.168.18.13:3000/pesoreal.html',
} as const;