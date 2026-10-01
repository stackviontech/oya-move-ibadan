// Share helper: uses the phone's native share sheet when available, otherwise
// copies the message + link to the clipboard.
import { isTouchDevice } from './helpers.js';

/** The link people should open to play (current page without ?query or #hash). */
export function gameUrl() {
  return window.location.origin + window.location.pathname;
}

/**
 * Share a message. Resolves to 'shared', 'copied' or 'failed' so the UI can
 * show the right feedback.
 */
export async function shareMessage(text) {
  const url = gameUrl();
  const full = `${text} ${url}`;

  // Native share sheet (WhatsApp, Twitter/X, etc.) — mainly on phones.
  if (isTouchDevice() && navigator.share) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // fall through to clipboard copy
    }
  }

  // Modern clipboard API (needs https or localhost).
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(full);
      return 'copied';
    } catch {
      /* fall through to the old-school method */
    }
  }

  // Old-school fallback: hidden textarea + execCommand('copy').
  try {
    const ta = document.createElement('textarea');
    ta.value = full;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
