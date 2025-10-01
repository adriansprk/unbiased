import { describe, it, expect } from 'vitest';

// Import the proseOnly function - we'll need to export it first
// For now, let's test the patterns we added

describe('proseOnly filtering', () => {
  it('should detect SPIEGEL Gruppe header', () => {
    const pattern = /^#+\s*(SPIEGEL Gruppe|SPIEGEL Games|Suche starten)/i;
    expect(pattern.test('## SPIEGEL Gruppe')).toBe(true);
    expect(pattern.test('# SPIEGEL Games')).toBe(true);
    expect(pattern.test('### Suche starten')).toBe(true);
  });

  it('should detect game navigation items', () => {
    const pattern = /^(Wordle|Viererkette|Wortsuche|Paarsuche|Wabenrätsel|Das tägliche Quiz|Kreuzworträt.*sel|Solitär|Sudoku|Mahjong|Bubble-Shooter)/i;
    expect(pattern.test('Wordle')).toBe(true);
    expect(pattern.test('Kreuzworträtsel')).toBe(true);
    expect(pattern.test('Das tägliche Quiz')).toBe(true);
    expect(pattern.test('Sudoku')).toBe(true);
  });

  it('should detect "Mehr lesen über" sections', () => {
    const pattern = /^(Mehr lesen über|More topics)/i;
    expect(pattern.test('Mehr lesen über')).toBe(true);
    expect(pattern.test('More topics')).toBe(true);
  });

  it('should detect navigation menu items', () => {
    const pattern = /^(Politik|Ausland|Panorama|Sport|Wirtschaft|Wissenschaft|Netzwelt|Kultur|Leben|Geschichte|Mobilität)Menü/i;
    expect(pattern.test('PolitikMenü')).toBe(true);
    expect(pattern.test('WirtschaftMenü')).toBe(true);

    const patternWithSpace = /^(Politik|Ausland|Panorama|Sport|Wirtschaft|Wissenschaft|Netzwelt|Kultur|Leben|Geschichte|Mobilität)\s+(aufklappen|Menü)/i;
    expect(patternWithSpace.test('Politik aufklappen')).toBe(true);
    expect(patternWithSpace.test('Kultur Menü')).toBe(true);
  });

  it('should NOT match actual article content', () => {
    const gamePattern = /^(Wordle|Viererkette|Wortsuche|Paarsuche|Wabenrätsel|Das tägliche Quiz|Kreuzworträt.*sel|Solitär|Sudoku|Mahjong|Bubble-Shooter)/i;
    expect(gamePattern.test('Die Politik in Deutschland ist kompliziert')).toBe(false);
    expect(gamePattern.test('In der Wirtschaft gibt es Veränderungen')).toBe(false);

    const spiegelPattern = /^#+\s*(SPIEGEL Gruppe|SPIEGEL Games|Suche starten)/i;
    expect(spiegelPattern.test('Der SPIEGEL berichtet über aktuelle Ereignisse')).toBe(false);
  });
});
