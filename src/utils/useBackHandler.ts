import { useEffect } from 'react';
import { pushBackHandler } from './androidBackNavigation';

export function useBackHandler(handler: () => boolean | void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const unregister = pushBackHandler(handler);
    return unregister;
  }, [enabled, handler]);
}
