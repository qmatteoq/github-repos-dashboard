import { describe, expect, it } from 'vitest';
import {
  beginRepoLoad,
  completeRepoLoadFailure,
  completeRepoLoadSuccess,
  createInitialDashboardState,
  getNextAutoRefreshDelay,
  restoreRememberedUsername,
} from './dashboardState';

describe('dashboardState', () => {
  it('preserves same user data as stale on refresh failure', () => {
    const initial = completeRepoLoadSuccess(createInitialDashboardState(), 'owner', 'user', '2026-01-01T00:00:00Z', [
      {
        id: 1,
        name: 'repo',
        full_name: 'owner/repo',
        description: null,
        html_url: 'https://github.com/owner/repo',
        updated_at: '2026-01-01T00:00:00Z',
        pushed_at: '2026-01-01T00:00:00Z',
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        archived: false,
        fork: false,
        owner: {
          login: 'owner',
        },
      },
    ]);

    const loading = beginRepoLoad(initial, 'owner', 'user');
    const failed = completeRepoLoadFailure(loading, 'owner', 'user', 'Network request failed.', '2026-01-01T00:05:00Z');

    expect(failed.stale).toBe(true);
    expect(failed.repos).toHaveLength(1);
    expect(failed.status).toBe('ready');
    expect(failed.lastSuccessfulSync).toBe('2026-01-01T00:00:00Z');
    expect(failed.lastAttemptCompletedAt).toBe('2026-01-01T00:05:00Z');
  });

  it('clears old data when a different username starts loading', () => {
    const initial = completeRepoLoadSuccess(createInitialDashboardState(), 'owner', 'user', '2026-01-01T00:00:00Z', []);
    const loading = beginRepoLoad(initial, 'other-owner', 'user');
    const failed = completeRepoLoadFailure(loading, 'other-owner', 'user', 'Not found', '2026-01-01T00:02:00Z');

    expect(loading.loadedUsername).toBeNull();
    expect(loading.repos).toHaveLength(0);
    expect(loading.lastSuccessfulSync).toBeNull();
    expect(loading.lastAttemptCompletedAt).toBeNull();
    expect(failed.stale).toBe(false);
    expect(failed.loadedUsername).toBeNull();
    expect(failed.lastSuccessfulSync).toBeNull();
  });

  it('clears stale data when the same owner switches between user and organization modes', () => {
    const initial = completeRepoLoadSuccess(createInitialDashboardState(), 'owner', 'user', '2026-01-01T00:00:00Z', []);
    const loading = beginRepoLoad(initial, 'owner', 'organization');
    const failed = completeRepoLoadFailure(
      loading,
      'owner',
      'organization',
      'Connector request failed.',
      '2026-01-01T00:02:00Z',
    );

    expect(loading.loadedUsername).toBeNull();
    expect(loading.loadedAccountType).toBeNull();
    expect(failed.stale).toBe(false);
    expect(failed.loadedUsername).toBeNull();
    expect(failed.loadedAccountType).toBeNull();
  });

  it('pauses auto refresh while hidden or cooling down', () => {
    const hiddenDelay = getNextAutoRefreshDelay({
      enabled: true,
      intervalMs: 300000,
      isVisible: false,
      cooldownUntil: null,
      lastSuccessfulSync: '2026-01-01T00:00:00Z',
      lastAttemptCompletedAt: '2026-01-01T00:00:00Z',
      hasLoadedUsername: true,
      isLoading: false,
      now: Date.parse('2026-01-01T00:02:00Z'),
    });

    const cooldownDelay = getNextAutoRefreshDelay({
      enabled: true,
      intervalMs: 300000,
      isVisible: true,
      cooldownUntil: Date.parse('2026-01-01T00:10:00Z'),
      lastSuccessfulSync: '2026-01-01T00:02:00Z',
      lastAttemptCompletedAt: '2026-01-01T00:02:00Z',
      hasLoadedUsername: true,
      isLoading: false,
      now: Date.parse('2026-01-01T00:03:00Z'),
    });

    expect(hiddenDelay).toBeNull();
    expect(cooldownDelay).toBe(7 * 60 * 1000);
  });

  it('schedules the next auto refresh from the last completed attempt after a failed refresh', () => {
    const delay = getNextAutoRefreshDelay({
      enabled: true,
      intervalMs: 300000,
      isVisible: true,
      cooldownUntil: null,
      lastSuccessfulSync: '2026-01-01T00:00:00Z',
      lastAttemptCompletedAt: '2026-01-01T00:07:00Z',
      hasLoadedUsername: true,
      isLoading: false,
      now: Date.parse('2026-01-01T00:08:00Z'),
    });

    expect(delay).toBe(4 * 60 * 1000);
  });

  it('preserves empty successful data as stale when the next refresh fails', () => {
    const initial = completeRepoLoadSuccess(createInitialDashboardState(), 'owner', 'user', '2026-01-01T00:00:00Z', []);
    const loading = beginRepoLoad(initial, 'owner', 'user');
    const failed = completeRepoLoadFailure(loading, 'owner', 'user', 'Network request failed.', '2026-01-01T00:03:00Z');

    expect(failed.loadedUsername).toBe('owner');
    expect(failed.loadedAccountType).toBe('user');
    expect(failed.repos).toEqual([]);
    expect(failed.status).toBe('ready');
    expect(failed.stale).toBe(true);
  });

  it('restores only sensible remembered usernames', () => {
    expect(restoreRememberedUsername('octocat')).toBe('octocat');
    expect(restoreRememberedUsername('invalid name')).toBe('');
  });
});
