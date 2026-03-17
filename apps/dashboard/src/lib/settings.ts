import { db, settings } from './db';
import { eq } from 'drizzle-orm';
import {
  SETTING_SETUP_COMPLETE,
  SETTING_APP_NAME,
  SETTING_IMAGE_QUALITY,
  SETTING_IMAGE_FORMAT,
  SETTING_IMAGE_MAX_WIDTH,
  SETTING_IMAGE_MAX_HEIGHT,
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_IMAGE_FORMAT,
  DEFAULT_IMAGE_MAX_WIDTH,
  DEFAULT_IMAGE_MAX_HEIGHT,
} from '@displaygrid/shared';

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function isSetupComplete(): Promise<boolean> {
  const val = await getSetting(SETTING_SETUP_COMPLETE);
  return val === '1';
}

export async function getAppName(): Promise<string> {
  return (await getSetting(SETTING_APP_NAME)) ?? 'DisplayGrid';
}

export interface CompressionSettings {
  quality:   number;
  format:    string;
  maxWidth:  number;
  maxHeight: number;
}

export async function getCompressionSettings(): Promise<CompressionSettings> {
  const [quality, format, maxWidth, maxHeight] = await Promise.all([
    getSetting(SETTING_IMAGE_QUALITY),
    getSetting(SETTING_IMAGE_FORMAT),
    getSetting(SETTING_IMAGE_MAX_WIDTH),
    getSetting(SETTING_IMAGE_MAX_HEIGHT),
  ]);
  return {
    quality:   quality   ? parseInt(quality)   : DEFAULT_IMAGE_QUALITY,
    format:    format    ?? DEFAULT_IMAGE_FORMAT,
    maxWidth:  maxWidth  ? parseInt(maxWidth)  : DEFAULT_IMAGE_MAX_WIDTH,
    maxHeight: maxHeight ? parseInt(maxHeight) : DEFAULT_IMAGE_MAX_HEIGHT,
  };
}
