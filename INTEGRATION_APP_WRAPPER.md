Skunked: Way of the Spray — App Wrapper Integration Guide

This file shows how a host application (web page iframe or native WebView wrapper) can force Skunked into the rotated landscape mode, clear it, and receive status events.

Message events supported (postMessage to the game window):

- FORCE_LANDSCAPE
  - Description: Ask Skunked to enable the "rotated canvas" forced landscape mode. Equivalent to the user pressing "Play Anyway (Rotate Canvas)".
  - Example (parent page with iframe):
    iframe.contentWindow.postMessage({ type: 'FORCE_LANDSCAPE' }, '*');

- CLEAR_FORCED_LANDSCAPE
  - Description: Clear forced-landscape and return to natural orientation handling.
  - Example:
    iframe.contentWindow.postMessage({ type: 'CLEAR_FORCED_LANDSCAPE' }, '*');

- REQUEST_STATUS
  - Description: Ask Skunked to reply with its current status.
  - Example:
    iframe.contentWindow.postMessage({ type: 'REQUEST_STATUS' }, '*');

Events emitted by Skunked (received via window message on the parent):

- { source: 'Skunked', type: 'FORCED_LANDSCAPE_SET', value: true }
- { source: 'Skunked', type: 'FORCED_LANDSCAPE_CLEARED', value: true }
- { source: 'Skunked', type: 'GAME_READY' }
- { source: 'Skunked', type: 'GAME_STATE', state: '<MENU|PLAYING|GAME_OVER|...>' }
- { source: 'Skunked', type: 'STATUS', status: { forced: boolean, ready: boolean, state: string } }

Parent-listener example (web iframe):

window.addEventListener('message', (ev) => {
  try {
    const m = ev.data;
    if (!m || m.source !== 'Skunked') return;
    console.log('Skunked message:', m);
    // handle events (e.g., show UI, change orientation preference, etc.)
  } catch (e) { }
});

Notes for mobile app WebViews

- For a native wrapper (Android/iOS) that runs Skunked in a WebView, use the platform's "evaluateJavascript" (Android) or "evaluateJavaScript" (iOS) to call into the page and execute:

  window.postMessage({ type: 'FORCE_LANDSCAPE' }, '*');

  (Alternatively, inject a short script that calls the `message` event directly.)

- When using React Native WebView, you can use `injectedJavaScript` or `ref.injectJavaScript(...)` to `window.postMessage(...)` into the page.

Security

- The game currently uses `postMessage(..., '*')` when acknowledging events. If you know the origin of the wrapper, modify Skunked's `index.html` (the message handler) to validate `event.origin` before trusting commands and replying.

If you want, I can also add a small test page in `SkunkFU/tools/` that simulates a wrapper sending these messages and visualizes SkunkFU's responses for easier QA.