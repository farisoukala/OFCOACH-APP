import { LucideIcon } from 'lucide-react';

export type UserRole = 'coach' | 'athlete';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status?: 'online' | 'offline' | string;
}

export interface Client extends User {
  weight: number;
  height: number;
  targetWeight: number;
  age: number;
  objectives: string;
  medicalRisks: string;
  lastUpdate: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type Screen = 
  | 'login' 
  | 'register' 
  | 'verify'
  | 'forgot_password'
  | 'reset_password' 
  | 'coach_dashboard' 
  | 'client_list' 
  | 'client_profile' 
  | 'athlete_dashboard' 
  | 'nutrition' 
  | 'workout' 
  | 'messages' 
  | 'progress'
  | 'calendar'
  | 'settings'
  | 'notifications';
