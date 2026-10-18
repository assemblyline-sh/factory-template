// @ts-check
import { defineStep, attachReport, attachWorkpieces, bin, logEvent, renderLocal } from '@assemblyline/lib-factory';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

const REGISTRY_PATH = path.join('temp', 'stations', 'EX0', 'intake-registry.jsonl');

export default defineStep({
  slug: 'EX0_01_intake',
  name: 'Intake samples',
  description: 'Seed one workpiece per .txt file in config.source_dir that is not yet in the intake registry.',

  inputSchema: z.object({
    source_dir: z.string().describe('Folder of .txt files, relative to the factory root'),
  }),
  outputSchema: z.object({
    seeded_count: z.number(),
    skipped_count: z.number(),
  }),

  execute: async (config, context) => {
    const { work_record } = context;
    const seen = loadRegistry(REGISTRY_PATH);
    const output_bin = bin('EX0', 'output');

    const files = fs.existsSync(config.source_dir)
      ? fs.readdirSync(config.source_dir).filter((f) => f.endsWith('.txt')).sort()
      : [];

    /** @type {string[]} */
    const seeded = [];
    for (const file of files) {
      const workpiece_id = path.basename(file, '.txt');
      if (seen.has(workpiece_id)) continue;

      // Pointer first, registry second: a crash between the two re-seeds the
      // workpiece next run instead of losing it.
      const wp = path.join(output_bin, workpiece_id);
      fs.mkdirSync(wp, { recursive: true });
      fs.copyFileSync(path.join(config.source_dir, file), path.join(wp, 'document.txt'));
      const pointer = { workpiece_id, source_file: path.join(config.source_dir, file), seeded_at: new Date().toISOString() };
      fs.writeFileSync(path.join(wp, 'pointer.json'), JSON.stringify(pointer, null, 2));
      logEvent(wp, 'EX0', work_record.id, 'workpiece_created');

      fs.appendFileSync(REGISTRY_PATH, JSON.stringify(pointer) + '\n');
      seen.add(workpiece_id);
      seeded.push(workpiece_id);
    }

    // Line-head: creating a workpiece is this station's work, so each counts as done.
    /** @type {Record<string, 'done' | 'failed'>} */
    const workpieces = {};
    for (const id of seeded) workpieces[id] = 'done';
    await attachWorkpieces(work_record.id, workpieces);

    const skipped_count = files.length - seeded.length;
    await attachReport(work_record.id, renderLocal(import.meta.url, './report.md', { seeded, skipped_count, source_dir: config.source_dir }));

    return { seeded_count: seeded.length, skipped_count };
  },
});

/**
 * Workpiece ids already seeded. Creates the registry's folder so the first append works.
 * @param {string} file_path
 * @returns {Set<string>}
 */
function loadRegistry(file_path) {
  if (!fs.existsSync(file_path)) {
    fs.mkdirSync(path.dirname(file_path), { recursive: true });
    return new Set();
  }
  const ids = fs.readFileSync(file_path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line).workpiece_id);
  return new Set(ids);
}
