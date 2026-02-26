// Azure Computer Vision barcode recognition utility
// Reads `VITE_AZURE_ENDPOINT` and `VITE_AZURE_KEY` from import.meta.env
// If `VITE_USE_BACKEND_PROXY=true` the client will POST to `/api/azure-read` first.

import { logger } from './logService';

function getEnvVar(name: string): string | undefined {
  // Vite exposes variables on import.meta.env with VITE_ prefix
  // @ts-ignore
  return import.meta.env?.[name];
}

function normalizeBase64Input(base64Image: string): string {
  if (!base64Image) return '';
  if (base64Image.startsWith('data:')) {
    const parts = base64Image.split(',');
    return parts.length > 1 ? parts[1] : '';
  }
  return base64Image.replace(/\s/g, '');
}

async function tryProxy(base64Image: string): Promise<string[] | null> {
  try {
    const resp = await fetch('/api/azure-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Image })
    });
    if (!resp.ok) {
      logger.warn('Proxy responded with non-ok status', resp.status);
      return null;
    }
    const data = await resp.json();
    // Expecting either an array of strings or an object with results
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.barcodes)) return data.barcodes;
    return null;
  } catch (err) {
    logger.warn('Proxy call failed', err);
    return null;
  }
}

export async function detectBarcodeAzure(base64Image: string): Promise<string[]> {
  const useProxy = getEnvVar('VITE_USE_BACKEND_PROXY') === 'true';
  const b64 = normalizeBase64Input(base64Image);
  if (!b64) return [];

  if (useProxy) {
    const fromProxy = await tryProxy(base64Image);
    if (fromProxy && fromProxy.length) {
      logger.log('Using backend proxy for Azure recognition, found:', fromProxy.length);
      return fromProxy;
    }
    logger.warn('Backend proxy returned no results, falling back to direct Azure call');
  }

  const endpoint = getEnvVar('VITE_AZURE_ENDPOINT');
  const key = getEnvVar('VITE_AZURE_KEY');

  if (!endpoint || !key) {
    throw new Error('Azure configuration missing. Set VITE_AZURE_ENDPOINT and VITE_AZURE_KEY.');
  }

  // Convert base64 to binary blob
  const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const response = await fetch(`${endpoint.replace(/\/$/, '')}/vision/v3.2/read/analyze`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/octet-stream'
    },
    body: binary
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    logger.error(`Azure API request failed: ${response.status} ${response.statusText} ${text}`);
    throw new Error(`Azure API request failed: ${response.status} ${response.statusText} ${text}`);
  }

  const operationUrl = response.headers.get('operation-location');
  if (!operationUrl) throw new Error('Missing operation-location header from Azure');

  // Poll for result (short polling with timeout)
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const poll = await fetch(operationUrl, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    if (!poll.ok) {
      logger.warn('Azure poll request not ok, status:', poll.status);
      continue;
    }
    const data = await poll.json();
    if (data.status === 'succeeded') {
      const results: string[] = (data.analyzeResult?.readResults || [])
        .flatMap((page: any) => (page.barcodes || []).map((b: any) => b.value));
      logger.log('Azure recognition succeeded, found:', results.length);
      return results;
    }
    if (data.status === 'failed') {
      logger.warn('Azure recognition failed');
      break;
    }
  }

  throw new Error('Azure barcode recognition timeout');
}
