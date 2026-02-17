type HapticPattern = number | number[];

const canVibrate = (): boolean => typeof navigator !== 'undefined' && 'vibrate' in navigator;

const trigger = (pattern: HapticPattern): void => {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silent fallback for unsupported environments.
  }
};

export const hapticService = {
  impactLight: () => trigger(18),
  impactMedium: () => trigger(35),
  impactHeavy: () => trigger(55),
  success: () => trigger([14, 24, 30]),
  warning: () => trigger([22, 28, 22]),
  error: () => trigger([40, 35, 40]),
};
