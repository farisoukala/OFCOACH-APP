export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: 0, label: '' };

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const len = password.length;

  const criteriaCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (len < 6) return { level: 1, label: 'Très faible' };
  if (len < 8 && criteriaCount < 2) return { level: 1, label: 'Faible' };
  if (len < 8 || criteriaCount < 2) return { level: 2, label: 'Moyen' };
  if (len < 10 || criteriaCount < 3) return { level: 3, label: 'Bon' };
  return { level: 4, label: 'Fort' };
}

export const strengthColors: Record<PasswordStrengthLevel, string> = {
  0: 'bg-transparent',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-lime-500',
  4: 'bg-green-500',
};

export const strengthLabelColors: Record<PasswordStrengthLevel, string> = {
  0: 'text-slate-400',
  1: 'text-red-500',
  2: 'text-amber-500',
  3: 'text-lime-600 dark:text-lime-400',
  4: 'text-green-600 dark:text-green-400',
};
