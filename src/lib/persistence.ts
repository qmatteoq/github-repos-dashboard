import { restoreRememberedUsername } from './dashboardState';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type ReadStoredValueResult = {
  value: string;
  warning: string | null;
};

function getStorageErrorMessage(action: 'read' | 'save'): string {
  return action === 'read'
    ? 'Saved usernames are unavailable because browser storage is blocked.'
    : 'This browser blocked saving the username locally. Reloading will forget it.';
}

export function readStoredUsername(
  storageFactory: () => StorageLike,
  storageKey: string,
): ReadStoredValueResult {
  try {
    return {
      value: restoreRememberedUsername(storageFactory().getItem(storageKey)),
      warning: null,
    };
  } catch {
    return {
      value: '',
      warning: getStorageErrorMessage('read'),
    };
  }
}

export function writeStoredUsername(
  storageFactory: () => StorageLike,
  storageKey: string,
  username: string,
): string | null {
  try {
    storageFactory().setItem(storageKey, username);
    return null;
  } catch {
    return getStorageErrorMessage('save');
  }
}
