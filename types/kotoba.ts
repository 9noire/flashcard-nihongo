export interface KotobaItem {
  id: string; // e.g. "8_1" or Firestore doc ID
  lessonId: number; // e.g. 8
  no: number; // e.g. 1
  kana: string; // e.g. "ハンサム「な」"
  kanji?: string; // e.g. "静か「な」"
  arti: string; // e.g. "tampan, gagah, ganteng"
  updatedAt?: number;
}

export interface Lesson {
  lessonId: number;
  title: string;
  totalCount: number;
  createdAt: number;
}

export type CardFrontPreference = 'kana' | 'kanji' | 'arti';
export type CardOrderPreference = 'sequential' | 'shuffled';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
