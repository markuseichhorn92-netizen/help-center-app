import { NextResponse } from 'next/server';

// Default categories for the help center
const defaultCategories = [
  { id: 'mitgliedschaft', name: 'Mitgliedschaft', icon: 'card', description: 'Verträge, Kündigung & Beitrag' },
  { id: 'training', name: 'Training', icon: 'dumbbell', description: 'Kurse, Geräte & Trainingsplan' },
  { id: 'studio', name: 'Studio', icon: 'building', description: 'Öffnungszeiten, Ausstattung & Standort' },
  { id: 'konto', name: 'Mein Konto', icon: 'user', description: 'Login, Profil & Einstellungen' },
  { id: 'sonstiges', name: 'Sonstiges', icon: 'more', description: 'Weitere Themen & Fragen' },
];

export async function GET() {
  // Return default categories
  // In the future, this could be extended to load custom categories from KV
  return NextResponse.json(defaultCategories);
}
