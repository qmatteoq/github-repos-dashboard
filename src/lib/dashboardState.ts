import { normalizeUsername, isValidGitHubUsername } from '../api/github';
import type { RepoDashboardState } from '../types';

export function createInitialDashboardState(restoredUsername = ''): RepoDashboardState {
  return {
    requestedUsername: restoredUsername,
    loadedUsername: null,
    repos: [],
    status: 'idle',
    stale: false,
    error: null,
    lastSuccessfulSync: null,
    lastAttemptCompletedAt: null,
  };
}

export function beginRepoLoad(state: RepoDashboardState, username: string): RepoDashboardState {
  const normalizedUsername = normalizeUsername(username);
  const sameUser = state.loadedUsername === normalizedUsername;

  return {
    ...state,
    requestedUsername: normalizedUsername,
    loadedUsername: sameUser ? state.loadedUsername : null,
    repos: sameUser ? state.repos : [],
    stale: false,
    error: null,
    status: 'loading',
    lastSuccessfulSync: sameUser ? state.lastSuccessfulSync : null,
    lastAttemptCompletedAt: sameUser ? state.lastAttemptCompletedAt : null,
  };
}

export function completeRepoLoadSuccess(
  state: RepoDashboardState,
  username: string,
  syncedAt: string,
  repos: RepoDashboardState['repos'],
): RepoDashboardState {
  return {
    ...state,
    requestedUsername: username,
    loadedUsername: username,
    repos,
    status: 'ready',
    stale: false,
    error: null,
    lastSuccessfulSync: syncedAt,
    lastAttemptCompletedAt: syncedAt,
  };
}

export function completeRepoLoadFailure(
  state: RepoDashboardState,
  username: string,
  message: string,
  attemptedAt: string,
): RepoDashboardState {
  const normalizedUsername = normalizeUsername(username);
  const preserveExisting = state.loadedUsername === normalizedUsername && state.lastSuccessfulSync !== null;

  return {
    ...state,
    requestedUsername: normalizedUsername,
    status: preserveExisting ? 'ready' : 'error',
    stale: preserveExisting,
    error: message,
    loadedUsername: preserveExisting ? state.loadedUsername : null,
    repos: preserveExisting ? state.repos : [],
    lastSuccessfulSync: preserveExisting ? state.lastSuccessfulSync : null,
    lastAttemptCompletedAt: attemptedAt,
  };
}

export function restoreRememberedUsername(value: string | null): string {
  const normalized = normalizeUsername(value ?? '');
  return isValidGitHubUsername(normalized) ? normalized : '';
}

export function getNextAutoRefreshDelay(input: {
  enabled: boolean;
  intervalMs: number;
  isVisible: boolean;
  cooldownUntil: number | null;
  lastSuccessfulSync: string | null;
  lastAttemptCompletedAt: string | null;
  hasLoadedUsername: boolean;
  isLoading: boolean;
  now: number;
}): number | null {
  if (!input.enabled || !input.isVisible || !input.hasLoadedUsername || input.isLoading) {
    return null;
  }

  const lastAttemptAtMs = input.lastAttemptCompletedAt
    ? Date.parse(input.lastAttemptCompletedAt)
    : input.lastSuccessfulSync
      ? Date.parse(input.lastSuccessfulSync)
      : input.now;
  const baseDelay = Math.max(input.intervalMs - (input.now - lastAttemptAtMs), 0);
  const cooldownDelay =
    input.cooldownUntil && input.cooldownUntil > input.now ? input.cooldownUntil - input.now : 0;

  return Math.max(baseDelay, cooldownDelay);
}
