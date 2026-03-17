// ─── Roles ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

// ─── Content ──────────────────────────────────────────────────────────────────

export type AssetType = 'image' | 'video' | 'pdf' | 'html' | 'url';

export type SlideContentType = 'asset' | 'url' | 'html' | 'clock' | 'rss' | 'text';

export type Transition = 'fade' | 'slide' | 'none';

export type ColourProfile = 'srgb' | 'display-p3';

// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface SlideSchedule {
  /** 0 = Sunday … 6 = Saturday */
  days?:      number[];
  startTime?: string;   // 'HH:MM'
  endTime?:   string;   // 'HH:MM'
  startDate?: string;   // 'YYYY-MM-DD'
  endDate?:   string;   // 'YYYY-MM-DD'
}

// ─── API response shapes (used by both dashboard and display client) ──────────

export interface SlideResponse {
  id:              number;
  assetId:         number | null;
  contentType:     SlideContentType;
  content:         string | null;
  durationSeconds: number;
  transition:      Transition;
  sortOrder:       number;
  schedule:        SlideSchedule | null;
  enabled:         boolean;
  assetUrl?:       string;
  assetType?:      AssetType;
}

export interface PlaylistResponse {
  playlistId:   number;
  playlistName: string;
  screenName:   string;
  slides:       SlideResponse[];
}

export interface ClientConfig {
  appName:       string;
  wsUrl:         string;
  kioskKeyCombo: string;
  hasPIN:        boolean;
  version:       string;
}

export interface ScreenSession {
  screenId:       number;
  lastSeen:       Date | null;
  ip:             string | null;
  currentSlideId: number | null;
  clientVersion:  string | null;
}

// ─── WebSocket message types ──────────────────────────────────────────────────

export type WsMessageToClient =
  | { type: 'playlist_updated'; token: string }
  | { type: 'emergency'; assetId: number | null; message: string | null }
  | { type: 'emergency_clear' }
  | { type: 'refresh' };
