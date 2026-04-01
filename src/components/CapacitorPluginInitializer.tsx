'use client';

import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Initialize custom Capacitor plugins on app startup.
 * This ensures TcpClient and other local plugins are registered
 * even if they're not in capacitor.plugins.json.
 */
export function CapacitorPluginInitializer() {
  useEffect(() => {
    let removeKeyboardWillShow: (() => void) | undefined;
    let removeKeyboardDidShow: (() => void) | undefined;
    let removeKeyboardWillHide: (() => void) | undefined;
    let removeKeyboardDidHide: (() => void) | undefined;
    let keyboardIsOpen = false;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const isInputTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;

      if (!isInputTarget) return;

      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, keyboardIsOpen ? 120 : 260);
    };

    document.addEventListener('focusin', handleFocusIn);

    if (Capacitor.isNativePlatform()) {
      try {
        // Force register TcpClient plugin
        // This bypasses the need for it to be in capacitor.plugins.json
        (window as any).Capacitor = Capacitor;
        
        console.log('[CapacitorInit] Platform:', Capacitor.getPlatform());
        console.log('[CapacitorInit] Registering TcpClient plugin...');
        
        // Create a web-side stub that will delegate to native
        const TcpClient = registerPlugin('TcpClient');
        console.log('[CapacitorInit] TcpClient registered:', !!TcpClient);
        
        // Test if plugin is available
        if (TcpClient) {
  console.log('[CapacitorInit] TcpClient disponível');
}

        import('@capacitor/keyboard')
          .then(async ({ Keyboard }) => {
            const applyKeyboardState = (isOpen: boolean) => {
              keyboardIsOpen = isOpen;
              document.body.classList.toggle('keyboard-open', isOpen);
            };

            removeKeyboardWillShow = await Keyboard.addListener('keyboardWillShow', (info) => {
              void info;
              applyKeyboardState(true);
            }).then((listener) => () => listener.remove());

            removeKeyboardDidShow = await Keyboard.addListener('keyboardDidShow', (info) => {
              void info;
              applyKeyboardState(true);
            }).then((listener) => () => listener.remove());

            removeKeyboardWillHide = await Keyboard.addListener('keyboardWillHide', () => {
              applyKeyboardState(false);
            }).then((listener) => () => listener.remove());

            removeKeyboardDidHide = await Keyboard.addListener('keyboardDidHide', () => {
              applyKeyboardState(false);
            }).then((listener) => () => listener.remove());
          })
          .catch((err) => {
            console.warn('[CapacitorInit] Keyboard plugin init failed:', err);
          });
        }
       catch (err) {
        console.error('[CapacitorInit] Error initializing plugins:', err);
      }
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      removeKeyboardWillShow?.();
      removeKeyboardDidShow?.();
      removeKeyboardWillHide?.();
      removeKeyboardDidHide?.();
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  return null; // This component doesn't render anything
}
