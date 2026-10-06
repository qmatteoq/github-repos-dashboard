import { describe, expect, it, vi } from 'vitest';
import { readStoredUsername, writeStoredUsername } from './persistence';

describe('persistence', () => {
  it('restores a remembered username when storage is available', () => {
    const result = readStoredUsername(
      () => ({
        getItem: vi.fn(() => 'octocat'),
        setItem: vi.fn(),
      }),
      'last-user',
    );

    expect(result).toEqual({
      value: 'octocat',
      warning: null,
    });
  });

  it('returns a visible warning when storage reads throw', () => {
    const result = readStoredUsername(
      () => ({
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: vi.fn(),
      }),
      'last-user',
    );

    expect(result.value).toBe('');
    expect(result.warning).toContain('browser storage is blocked');
  });

  it('reports save failures without turning them into API errors', () => {
    const warning = writeStoredUsername(
      () => ({
        getItem: vi.fn(),
        setItem: () => {
          throw new Error('quota');
        },
      }),
      'last-user',
      'octocat',
    );

    expect(warning).toContain('blocked saving the username locally');
  });
});
