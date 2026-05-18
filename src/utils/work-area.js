/**
 * Centralized work_area path resolution.
 * All file I/O flows through these helpers.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

const raw_work_area = process.env.WORK_AREA_PATH || 'work_area';
const WORK_AREA_ROOT = path.isAbsolute(raw_work_area)
  ? raw_work_area
  : path.join(PROJECT_ROOT, raw_work_area);

// ── Sub-directory paths
export const dirs = {
  root: WORK_AREA_ROOT,
  processing: path.join(PROJECT_ROOT, 'temp'),
  incoming_files: path.join(WORK_AREA_ROOT, 'incoming_files'),
};

// ── Convenience path builders
export function processingDir(work_record_id) {
  const dir = path.join(dirs.processing, 'work_records', work_record_id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function processingFile(work_record_id, filename) {
  const dir = processingDir(work_record_id);
  return path.join(dir, filename);
}

// ── Bootstrap
export function ensureWorkArea() {
  for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
