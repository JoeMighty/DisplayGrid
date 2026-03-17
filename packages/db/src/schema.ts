import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role:         text('role', { enum: ['super_admin', 'admin', 'operator', 'viewer'] })
                  .notNull().default('viewer'),
  createdAt:    integer('created_at', { mode: 'timestamp' })
                  .$defaultFn(() => new Date()),
});

export const zones = sqliteTable('zones', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  description: text('description'),
});

export const screens = sqliteTable('screens', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  name:          text('name').notNull(),
  zoneId:        integer('zone_id').references(() => zones.id),
  resolutionW:   integer('resolution_w').notNull().default(1920),
  resolutionH:   integer('resolution_h').notNull().default(1080),
  refreshRate:   integer('refresh_rate').notNull().default(60),
  rotation:      integer('rotation').notNull().default(0),
  panelGridCols: integer('panel_grid_cols').default(1),
  panelGridRows: integer('panel_grid_rows').default(1),
  colourProfile: text('colour_profile').default('srgb'),
  token:         text('token').notNull().unique(),
  createdAt:     integer('created_at', { mode: 'timestamp' })
                   .$defaultFn(() => new Date()),
});

export const assets = sqliteTable('assets', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  filename:        text('filename').notNull(),
  originalName:    text('original_name').notNull(),
  mimeType:        text('mime_type').notNull(),
  type:            text('type', { enum: ['image', 'video', 'pdf', 'html', 'url'] }).notNull(),
  path:            text('path').notNull(),
  sizeBytes:       integer('size_bytes'),
  durationSeconds: real('duration_seconds'),
  uploadedAt:      integer('uploaded_at', { mode: 'timestamp' })
                     .$defaultFn(() => new Date()),
});

export const playlists = sqliteTable('playlists', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  screenId: integer('screen_id').notNull()
              .references(() => screens.id, { onDelete: 'cascade' }),
  name:     text('name').notNull().default('Default'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const slides = sqliteTable('slides', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  playlistId:      integer('playlist_id').notNull()
                     .references(() => playlists.id, { onDelete: 'cascade' }),
  assetId:         integer('asset_id').references(() => assets.id),
  contentType:     text('content_type', {
                     enum: ['asset', 'url', 'html', 'clock', 'rss', 'text'],
                   }).notNull(),
  content:         text('content'),
  durationSeconds: real('duration_seconds').notNull().default(10),
  transition:      text('transition').default('fade'),
  sortOrder:       integer('sort_order').notNull().default(0),
  scheduleJson:    text('schedule_json'),
  enabled:         integer('enabled', { mode: 'boolean' }).default(true),
});

export const screenSessions = sqliteTable('screen_sessions', {
  screenId:       integer('screen_id').primaryKey()
                    .references(() => screens.id, { onDelete: 'cascade' }),
  lastSeen:       integer('last_seen', { mode: 'timestamp' }),
  ip:             text('ip'),
  currentSlideId: integer('current_slide_id'),
  clientVersion:  text('client_version'),
});

// Key/value store for app settings.
// Known keys: setup_complete, app_name, kiosk_pin, kiosk_key_combo,
//             image_quality, image_format, image_max_width, image_max_height
export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value'),
});

export const tutorialProgress = sqliteTable('tutorial_progress', {
  step:        integer('step').primaryKey(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const screenRegions = sqliteTable('screen_regions', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  screenId:   integer('screen_id').notNull()
                .references(() => screens.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  x:          real('x').notNull().default(0),
  y:          real('y').notNull().default(0),
  width:      real('width').notNull().default(100),
  height:     real('height').notNull().default(100),
  playlistId: integer('playlist_id')
                .references(() => playlists.id, { onDelete: 'set null' }),
  sortOrder:  integer('sort_order').notNull().default(0),
});

export const emergencyOverride = sqliteTable('emergency_override', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  assetId:   integer('asset_id').references(() => assets.id),
  message:   text('message'),
  activeTo:  integer('active_to', { mode: 'timestamp' }),
  isActive:  integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
               .$defaultFn(() => new Date()),
});
