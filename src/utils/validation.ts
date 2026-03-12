const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test((value || '').trim());
}

export function validateEmail(value: string): string | null {
  const v = (value || '').trim();
  if (!v) return 'L\'email est requis.';
  if (!isValidEmail(v)) return 'Adresse email invalide.';
  return null;
}

export function validatePassword(value: string, minLength = 6): string | null {
  if (!value) return 'Le mot de passe est requis.';
  if (value.length < minLength) return `Le mot de passe doit contenir au moins ${minLength} caractères.`;
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return 'Veuillez confirmer le mot de passe.';
  if (password !== confirm) return 'Les mots de passe ne correspondent pas.';
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!(value || '').trim()) return `${fieldName} est requis.`;
  return null;
}

export function validateNumber(value: string, options: { min?: number; max?: number; fieldName?: string }): string | null {
  const v = value.trim();
  if (!v) return null;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return options.fieldName ? `${options.fieldName} doit être un nombre.` : 'Valeur invalide.';
  if (options.min != null && n < options.min) return `Minimum ${options.min}.`;
  if (options.max != null && n > options.max) return `Maximum ${options.max}.`;
  return null;
}

export function validateDateOfBirth(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date invalide.';
  if (d > new Date()) return 'La date ne peut pas être dans le futur.';
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 10 || age > 120) return 'Vérifiez la date de naissance.';
  return null;
}
