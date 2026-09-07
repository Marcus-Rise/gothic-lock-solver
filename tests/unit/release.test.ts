import { describe, expect, it } from 'vitest';
import { canaryVersion } from '../../.github/scripts/release.ts';

describe('release version identity', () => {
  it('derives unique canaries from the successful CI run without modifying source metadata', () => {
    expect(canaryVersion('1.2.3', 'a'.repeat(40), '123', '2')).toBe('1.2.3-canary.123.2.aaaaaaaaaaaa');
    expect(canaryVersion('1.2.3', 'a'.repeat(40), '123', '3')).toBe('1.2.3-canary.123.3.aaaaaaaaaaaa');
  });
  it('rejects malformed source, run and base version identities', () => {
    for (const [version, sha, run, attempt] of [['1.2.3', 'wrong', '123', '2'], ['1.2.3', 'a'.repeat(40), '0', '2'],
      ['1.2.3', 'a'.repeat(40), '123', '01'], ['1.2.3-beta', 'a'.repeat(40), '123', '2']]) {
      if (!version || !sha || !run || !attempt) throw new Error('Missing test input');
      expect(() => canaryVersion(version, sha, run, attempt)).toThrow(/identity|version/i);
    }
  });
});
