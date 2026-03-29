/** Ligne `public.users` (champs courants côté app). */
export type PublicUserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string | null;
  coach_id?: string | null;
};

/** Message (table `messages` ou équivalent). */
export type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  is_read?: boolean;
  timestamp?: string;
  created_at?: string;
};

/** Événement calendrier fusionné (perso + RDV). */
export type CalendarListRow = {
  id: string;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  duration?: string | null;
  type?: string | null;
  color?: string | null;
  user_id?: string | null;
  starts_at?: string | null;
  notes?: string | null;
  [key: string]: unknown;
};
