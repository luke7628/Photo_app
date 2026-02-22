export type ScanMode = 'serial' | 'part';

type DecodeEngine = 'zxing' | 'quagga' | 'jsqr' | 'native';

export interface DecodeCandidate {
  text: string;
  engine: DecodeEngine;
  engineConfidence: number;
  format?: string;
  region?: string;
  regionIndex?: number;
}

export interface RecognitionDecision {
  mode: ScanMode;
  value: string;
  score: number;
  votes: number;
}

const digitMap: Record<string, string> = {
  O: '0',
  o: '0',
  I: '1',
  i: '1',
  l: '1',
  Z: '2',
  z: '2',
  S: '5',
  s: '5'
};

const SCORE_THRESHOLD = 0.75;

function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function isLikelySerial(text: string): boolean {
  if (!/^[a-z0-9]{12,18}$/.test(text)) return false;
  if (text.includes('-')) return false;

  const digits = text.replace(/[^0-9]/g, '').length;
  const letters = text.replace(/[^a-z]/g, '').length;

  return digits >= letters * 2;
}

export function isLikelyPart(text: string): boolean {
  if (!/^[a-z0-9-]{8,24}$/.test(text)) return false;
  if (!text.includes('-')) return false;

  const parts = text.split('-');
  if (parts.length < 2 || parts.length > 4) return false;

  return parts.some(part => part.replace(/[^0-9]/g, '').length >= 2);
}

export function normalizeNumericHeavy(text: string): string {
  return text
    .split('')
    .map(char => digitMap[char] ?? char)
    .join('');
}

function scoreCandidate(text: string, conf: number, mode: ScanMode) {
  let score = conf * 0.6;

  const serialLike = isLikelySerial(text);
  const partLike = isLikelyPart(text);

  if (serialLike) score += 0.25;
  if (partLike) score += 0.25;
  if (/[^a-z0-9-]/.test(text)) score -= 0.3;

  if (mode === 'serial' && serialLike) score += 0.1;
  if (mode === 'part' && partLike) score += 0.1;
  if (mode === 'serial' && !serialLike) score -= 0.1;
  if (mode === 'part' && !partLike) score -= 0.1;

  return Math.max(0, Math.min(1.2, score));
}

function getModeAwareText(input: string, mode: ScanMode): string {
  const cleaned = sanitizeText(input);
  if (!cleaned) return '';

  if (mode === 'serial') {
    return normalizeNumericHeavy(cleaned);
  }

  return cleaned;
}

export function runRecognitionArbitration(
  candidates: DecodeCandidate[],
  mode: ScanMode,
  threshold: number = SCORE_THRESHOLD
): RecognitionDecision | null {
  if (!candidates.length) return null;

  const grouped = new Map<string, { scores: number[]; rawCount: number }>();

  for (const candidate of candidates) {
    const modeAwareText = getModeAwareText(candidate.text, mode);
    if (!modeAwareText) continue;

    const score = scoreCandidate(modeAwareText, candidate.engineConfidence, mode);
    const bucket = grouped.get(modeAwareText) ?? { scores: [], rawCount: 0 };
    bucket.scores.push(score);
    bucket.rawCount += 1;
    grouped.set(modeAwareText, bucket);
  }

  const ranked = Array.from(grouped.entries())
    .map(([value, aggregate]) => {
      const avgScore = aggregate.scores.reduce((sum, score) => sum + score, 0) / aggregate.scores.length;
      return {
        value,
        score: avgScore,
        votes: aggregate.rawCount
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.votes - a.votes;
    });

  const best = ranked[0];
  if (!best) return null;

  const passesModeRule = mode === 'serial' ? isLikelySerial(best.value) : isLikelyPart(best.value);
  if (!passesModeRule || best.score < threshold) {
    return null;
  }

  return {
    mode,
    value: best.value,
    score: best.score,
    votes: best.votes
  };
}

export function extractSerialAndPart(
  candidates: DecodeCandidate[],
  primaryMode: ScanMode
): { serialNumber: string; partNumber: string; decisions: { serial: RecognitionDecision | null; part: RecognitionDecision | null } } {
  const primaryDecision = runRecognitionArbitration(candidates, primaryMode);
  const secondaryMode: ScanMode = primaryMode === 'serial' ? 'part' : 'serial';
  const secondaryDecision = runRecognitionArbitration(candidates, secondaryMode);

  const serialDecision = primaryMode === 'serial' ? primaryDecision : secondaryDecision;
  const partDecision = primaryMode === 'part' ? primaryDecision : secondaryDecision;

  const serialNumber = serialDecision?.value ?? '';
  const partNumber = partDecision?.value ?? '';

  return {
    serialNumber,
    partNumber,
    decisions: {
      serial: serialDecision,
      part: partDecision
    }
  };
}
