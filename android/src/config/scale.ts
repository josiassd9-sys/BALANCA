// When running inside the webview we may be able to pick up
// settings saved by the user via localStorage.  This mirrors the behaviour
// of the web configuration helpers.
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
  } catch {}
  return undefined;
}

export const SCALE_CONFIG = {
  host: readSaved('tcpHost') || '192.168.18.13',
  port: readSaved('tcpPort') || 8080,
  httpPage: readSaved('httpUrl') || 'http://192.168.18.13:3000/pesoreal.html',
  reconnectMs: 3000,
};
