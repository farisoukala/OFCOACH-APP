import React from 'react';
import { getPasswordStrength, strengthColors, strengthLabelColors, type PasswordStrengthLevel } from '../utils/passwordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password, className = '' }) => {
  const { level, label } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className={`mt-1.5 ${className}`}>
      <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
        {([1, 2, 3, 4] as PasswordStrengthLevel[]).map((i) => (
          <div
            key={i}
            className={`flex-1 transition-all duration-200 ${i <= level ? strengthColors[i] : 'bg-transparent'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium mt-1 ${strengthLabelColors[level]}`}>{label}</p>
    </div>
  );
};
