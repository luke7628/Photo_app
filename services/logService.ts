// Lightweight logger wrapper. Logs only when Vite dev mode or VITE_DEBUG_LOGS=true.
const isEnabled = (typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG_LOGS === 'true')) || false;

function safeCall(fn: (...args: any[]) => void, args: any[]) {
  if (!isEnabled) return;
  try {
    fn(...args);
  } catch {
    // ignore
  }
}

export const logger = {
  log: (...args: any[]) => safeCall(console.log.bind(console), args),
  debug: (...args: any[]) => safeCall(console.debug ? console.debug.bind(console) : console.log.bind(console), args),
  info: (...args: any[]) => safeCall(console.info ? console.info.bind(console) : console.log.bind(console), args),
  warn: (...args: any[]) => safeCall(console.warn.bind(console), args),
  error: (...args: any[]) => safeCall(console.error.bind(console), args),
  table: (tab: any) => { if (isEnabled && (console as any).table) try { (console as any).table(tab); } catch {} }
};
