import { normalizeUsername, isValidGitHubUsername } from '../api/github';
import type { GitHubAccountType, RepoDashboardState } from '../types';

export function createInitialDashboardState(
  restoredUsername = '',
  restoredAccountType: GitHubAccountType = 'user',
): RepoDashboardState {
  return {
    requestedUsername: restoredUsername,
    requestedAccountType: restoredAccountType,
    loadedUsername: null,
    loadedAccountType: null,
    repos: [],
    status: 'idle',
    stale: false,
    error: null,
    lastSuccessfulSync: null,
    lastAttemptCompletedAt: null,
  };
}

export function beginRepoLoad(
  state: RepoDashboardState,
  username: string,
  accountType: GitHubAccountType,
): RepoDashboardState {
  const normalizedUsername = normalizeUsername(username);
  const sameRequest =
    state.loadedUsername === normalizedUsername && state.loadedAccountType === accountType;

  return {
    ...state,
    requestedUsername: normalizedUsername,
    requestedAccountType: accountType,
    loadedUsername: sameRequest ? state.loadedUsername : null,
    loadedAccountType: sameRequest ? state.loadedAccountType : null,
    repos: sameRequest ? state.repos : [],
    stale: false,
    error: null,
    status: 'loading',
    lastSuccessfulSync: sameRequest ? state.lastSuccessfulSync : null,
    lastAttemptCompletedAt: sameRequest ? state.lastAttemptCompletedAt : null,
  };
}

export function completeRepoLoadSuccess(
  state: RepoDashboardState,
  username: string,
  accountType: GitHubAccountType,
  syncedAt: string,
  repos: RepoDashboardState['repos'],
): RepoDashboardState {
  return {
    ...state,
    requestedUsername: username,
    requestedAccountType: accountType,
    loadedUsername: username,
    loadedAccountType: accountType,
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
  accountType: GitHubAccountType,
  message: string,
  attemptedAt: string,
): RepoDashboardState {
  const normalizedUsername = normalizeUsername(username);
  const preserveExisting =
    state.loadedUsername === normalizedUsername &&
    state.loadedAccountType === accountType &&
    state.lastSuccessfulSync !== null;

  return {
    ...state,
    requestedUsername: normalizedUsername,
    requestedAccountType: accountType,
    status: preserveExisting ? 'ready' : 'error',
    stale: preserveExisting,
    error: message,
    loadedUsername: preserveExisting ? state.loadedUsername : null,
    loadedAccountType: preserveExisting ? state.loadedAccountType : null,
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
