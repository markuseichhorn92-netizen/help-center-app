import { describe, it, expect } from 'vitest';
import { assignSlugs, isUuid, slugify } from './slug';

describe('slugify', () => {
  it('schreibt Umlaute um', () => {
    expect(slugify('Öffnungszeiten')).toBe('oeffnungszeiten');
    expect(slugify('Wie kann ich meine Daten aktualisieren?')).toBe('wie-kann-ich-meine-daten-aktualisieren');
    expect(slugify('Größe & Ärger – Übung')).toBe('groesse-aerger-uebung');
  });
  it('kürzt lange Titel an Wortgrenzen', () => {
    const s = slugify('Stoffwechselanalyse mit uvida: So optimierst du dein Training & deine Ernährung');
    expect(s.length).toBeLessThanOrEqual(70);
    expect(s.endsWith('-')).toBe(false);
    expect(s.startsWith('stoffwechselanalyse-mit-uvida')).toBe(true);
  });
  it('hat einen Fallback', () => expect(slugify('???')).toBe('artikel'));
});

describe('assignSlugs', () => {
  it('vergibt eindeutige, stabile Slugs', () => {
    const items = [
      { id: 'b', createdAt: '2026-02-01', t: 'Kurse' },
      { id: 'a', createdAt: '2026-01-01', t: 'Kurse' },
    ];
    const out = assignSlugs(items, (i) => i.t);
    expect(out.find((i) => i.id === 'a')!.slug).toBe('kurse');
    expect(out.find((i) => i.id === 'b')!.slug).toBe('kurse-2');
    expect(out.map((i) => i.id)).toEqual(['b', 'a']); // Reihenfolge bleibt
  });
});

describe('isUuid', () => {
  it('erkennt UUIDs', () => {
    expect(isUuid('a4ad8ca2-e73b-4f2e-89e9-c92d4c65c2a1')).toBe(true);
    expect(isUuid('oeffnungszeiten')).toBe(false);
  });
});
