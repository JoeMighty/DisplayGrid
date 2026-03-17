// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SLIDE_DURATION   = 10;   // seconds
export const DEFAULT_TRANSITION       = 'fade';
export const DEFAULT_RESOLUTION_W     = 1920;
export const DEFAULT_RESOLUTION_H     = 1080;
export const DEFAULT_REFRESH_RATE     = 60;
export const DEFAULT_IMAGE_QUALITY    = 90;
export const DEFAULT_IMAGE_FORMAT     = 'webp';
export const DEFAULT_IMAGE_MAX_WIDTH  = 3840;
export const DEFAULT_IMAGE_MAX_HEIGHT = 2160;

// ─── Heartbeat ────────────────────────────────────────────────────────────────

export const HEARTBEAT_INTERVAL_MS  = 15_000;   // 15 s
export const FALLBACK_POLL_MS       = 30_000;   // 30 s playlist re-fetch

// ─── Kiosk ────────────────────────────────────────────────────────────────────

export const DEFAULT_KIOSK_KEY_COMBO      = 'ctrl+shift+alt+d';
export const KIOSK_COMBO_HOLD_MS          = 3_000;
export const KIOSK_PIN_MAX_ATTEMPTS       = 3;
export const KIOSK_PIN_LOCKOUT_SECONDS    = 30;
export const KIOSK_PIN_INACTIVITY_SECONDS = 60;

// ─── Settings table keys ──────────────────────────────────────────────────────

export const SETTING_SETUP_COMPLETE    = 'setup_complete';
export const SETTING_APP_NAME          = 'app_name';
export const SETTING_KIOSK_PIN         = 'kiosk_pin';
export const SETTING_KIOSK_KEY_COMBO   = 'kiosk_key_combo';
export const SETTING_IMAGE_QUALITY     = 'image_quality';
export const SETTING_IMAGE_FORMAT      = 'image_format';
export const SETTING_IMAGE_MAX_WIDTH   = 'image_max_width';
export const SETTING_IMAGE_MAX_HEIGHT  = 'image_max_height';
