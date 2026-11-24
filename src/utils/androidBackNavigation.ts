// Android Predictive Back & System Back Gesture Manager
// Optimized for modern Android 14, 15, 16 (Pixel 8a, Pixel 9, Pixel 10a, Samsung OneUI)
// Supports Capacitor App Plugin + Native Bridge + CloseWatcher API + History Sentinel with Double-Back Exit protection.

import { App as CapApp } from '@capacitor/app';

type BackHandler = () => boolean | void;

const handlerStack: BackHandler[] = [];
let isInitialized = false;
let exitToastTimer: number | null = null;
let lastBackPressTime = 0;
let showExitToastCallback: ((show: boolean) => void) | null = null;
let exitAppCallback: (() => void) | null = null;

export function registerExitToastCallback(cb: (show: boolean) => void) {
  showExitToastCallback = cb;
}

declare global {
  interface Window {
    handleAndroidNativeBack?: () => boolean;
    CloseWatcher?: new (options?: { signal?: AbortSignal }) => {
      destroy: () => void;
      close: () => void;
      requestClose: () => void;
      onclose: (() => void) | null;
      oncancel: ((e: Event) => void) | null;
      addEventListener: (type: string, listener: (e: any) => void) => void;
      removeEventListener: (type: string, listener: (e: any) => void) => void;
    };
  }
}

let activeCloseWatcher: any = null;

function debugLog(...args: any[]) {
  console.log('[AndroidBackNav]', ...args);
}

/**
 * Arms or refreshes CloseWatcher using transient user activation.
 * In Chrome on Android, CloseWatcher intercepts system back gestures before
 * they can trigger app minimization.
 */
function armCloseWatcher() {
  if (typeof window === 'undefined' || !window.CloseWatcher) return;

  try {
    if (activeCloseWatcher) {
      activeCloseWatcher.destroy();
      activeCloseWatcher = null;
    }

    activeCloseWatcher = new window.CloseWatcher();
    debugLog('CloseWatcher armed, stack size:', handlerStack.length);

    activeCloseWatcher.oncancel = () => {
      debugLog('CloseWatcher cancel requested');
    };

    activeCloseWatcher.onclose = () => {
      debugLog('CloseWatcher close dispatched by system back gesture');
      handleBackInvoked();
      setTimeout(() => {
        armCloseWatcher();
      }, 50);
    };
  } catch (err) {
    debugLog('CloseWatcher arming deferred (needs user gesture)', err);
  }
}

/**
 * Ensures the history stack always has a sentinel forward entry.
 * On Android, if history pointer is at index 0, the system back gesture
 * instantly minimizes/closes the app without dispatching popstate.
 */
function ensureHistorySentinel() {
  if (typeof window === 'undefined') return;
  try {
    window.history.pushState(
      { __ereaderSentinel: true, timestamp: Date.now() },
      '',
      window.location.href
    );
    debugLog('History sentinel pushed. Total length:', window.history.length);
  } catch (err) {
    debugLog('History sentinel push failed', err);
  }
}

export function initAndroidBackNavigation(onExitApp?: () => void) {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;
  if (onExitApp) exitAppCallback = onExitApp;

  debugLog('Initializing Android Back Navigation for Pixel 8a / Pixel 10a & Android devices');

  // Push initial history sentinel
  ensureHistorySentinel();

  // Try arming CloseWatcher immediately
  armCloseWatcher();

  // 1. Capacitor Native Back Button Listener (CRITICAL for Capacitor APK on Pixel)
  try {
    CapApp.addListener('backButton', () => {
      debugLog('Capacitor native backButton event received');
      const handled = handleBackInvoked();
      if (!handled) {
        debugLog('Root back action: exiting app via CapApp.exitApp()');
        CapApp.exitApp();
      }
    });
  } catch (capErr) {
    debugLog('Capacitor App plugin listener skipped (running in browser)', capErr);
  }

  // 2. Expose global bridge hook for Android MainActivity.java
  window.handleAndroidNativeBack = () => {
    debugLog('Native Android back invoked directly via window.handleAndroidNativeBack');
    return handleBackInvoked();
  };

  // 3. User interaction listener to re-arm CloseWatcher when transient user activation is available
  const handleUserActivation = () => {
    if (!activeCloseWatcher) {
      armCloseWatcher();
    }
  };

  window.addEventListener('pointerdown', handleUserActivation, { passive: true, capture: true });
  window.addEventListener('touchstart', handleUserActivation, { passive: true, capture: true });

  // 4. Handle popstate for Chrome PWA and standard browsers
  window.addEventListener('popstate', (e) => {
    debugLog('popstate event received', e.state, 'stack size:', handlerStack.length);
    const handled = handleBackInvoked();
    // ALWAYS immediately re-push sentinel so history never sits at 0 on Android 14/15/16
    ensureHistorySentinel();
    if (!handled) {
      debugLog('Root back action completed');
    }
  });

  // Ensure body and root do not cancel vertical overscroll containment
  try {
    document.documentElement.style.overscrollBehaviorY = 'contain';
    document.body.style.overscrollBehaviorY = 'contain';
  } catch {
    // Ignore
  }
}

/**
 * Handles back invocation from CloseWatcher, popstate, Capacitor, or hardware back button.
 * Returns true if an action was handled (or exit toast shown), false if app should exit.
 */
export function handleBackInvoked(): boolean {
  debugLog('handleBackInvoked called, stack size:', handlerStack.length);

  // 1. If there are registered handlers (e.g. ReaderView, Modals, Drawers):
  if (handlerStack.length > 0) {
    const handler = handlerStack.pop();
    if (handler) {
      try {
        const res = handler();
        debugLog('Handler executed, returned:', res);
        armCloseWatcher();
        return res !== false;
      } catch (err) {
        console.error('[AndroidBackNav] Error in back handler', err);
        armCloseWatcher();
        return true;
      }
    }
  }

  // 2. We are at root (Library view). Handle "Double-back to exit"
  const now = Date.now();
  if (now - lastBackPressTime < 2400) {
    debugLog('Double-back confirmed: exiting app');
    if (showExitToastCallback) showExitToastCallback(false);
    if (exitAppCallback) {
      exitAppCallback();
    } else {
      try {
        CapApp.exitApp();
      } catch {
        window.history.go(-1);
      }
    }
    return false;
  } else {
    lastBackPressTime = now;
    debugLog('First back press at root: showing confirmation toast');
    ensureHistorySentinel();
    armCloseWatcher();

    if (showExitToastCallback) {
      showExitToastCallback(true);
      if (exitToastTimer) clearTimeout(exitToastTimer);
      exitToastTimer = window.setTimeout(() => {
        if (showExitToastCallback) showExitToastCallback(false);
        exitToastTimer = null;
      }, 2400);
    }
    return true;
  }
}

/**
 * Register a back action (e.g. closing a drawer, modal, or returning to library).
 * Handlers are invoked in Last-In-First-Out order.
 * Returns an unregister function.
 */
export function pushBackHandler(handler: BackHandler): () => void {
  handlerStack.push(handler);
  debugLog('pushBackHandler registered, new stack size:', handlerStack.length);
  ensureHistorySentinel();
  armCloseWatcher();

  let isRemoved = false;
  return () => {
    if (isRemoved) return;
    isRemoved = true;
    const idx = handlerStack.lastIndexOf(handler);
    if (idx !== -1) {
      handlerStack.splice(idx, 1);
      debugLog('pushBackHandler unregistered, remaining stack size:', handlerStack.length);
      armCloseWatcher();
    }
  };
}
