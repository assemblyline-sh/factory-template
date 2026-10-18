// @ts-check
import { defineStep, attachReport, attachWorkpieces, bin, listWorkpieces, processWorkpiece, countWords, renderLocal } from '@assemblyline/lib-factory';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

export default defineStep({
  slug: 'EX1_01_count_words',
  name: 'Count words',
  description: 'Count the words in each workpiece\'s document.txt and write result.json. An empty document fails.',

  inputSchema: z.object({}),
  outputSchema: z.object({
    done_count: z.number(),
    failed_count: z.number(),
  }),

  execute: async (_config, context) => {
    const { work_record } = context;

    /** @type {Record<string, 'done' | 'failed'>} */
    const workpieces = {};
    /** @type {{ workpiece_id: string, words?: number, error?: string }[]} */
    const results = [];

    for (const workpiece_id of listWorkpieces(bin('EX1', 'input'))) {
      const run = await processWorkpiece({
        station: 'EX1',
        workpiece_id,
        work_record_id: work_record.id,
        body: async (wp_doing) => {
          const text = fs.readFileSync(path.join(wp_doing, 'document.txt'), 'utf8');
          const words = countWords(text);
          if (words === 0) throw new Error('Empty document: nothing to count');
          fs.writeFileSync(path.join(wp_doing, 'result.json'), JSON.stringify({ words }, null, 2));
          return words;
        },
      });

      if (run.status === 'ok') {
        workpieces[workpiece_id] = 'done';
        results.push({ workpiece_id, words: run.value });
      } else {
        workpieces[workpiece_id] = 'failed';
        results.push({ workpiece_id, error: run.error.message });
      }
    }

    await attachWorkpieces(work_record.id, workpieces);
    await attachReport(work_record.id, renderLocal(import.meta.url, './report.md', { results }));

    const failed_count = results.filter((r) => r.error).length;
    return { done_count: results.length - failed_count, failed_count };
  },
});
