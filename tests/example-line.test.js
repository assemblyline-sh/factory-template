// @ts-check
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Runs the EX example line end to end against a temp factory root: intake,
 * conveyor, count. lib-factory resolves bins from process.cwd() when it is
 * imported, so the working directory changes before any import.
 */
describe('EX example line', () => {
  /** @type {string} */
  let root;
  /** @type {any} */
  let lib;
  /** @type {any} */
  let intake;
  /** @type {any} */
  let countWords;

  /** @param {any} definition @param {object} config */
  const run = (definition, config) =>
    lib.createHandler(definition)({ step: { slug: definition.slug, config }, work_record: { id: 'local-test', step_outputs: {} } });

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-template-'));
    fs.cpSync(path.join(repo_root, 'samples'), path.join(root, 'samples'), { recursive: true });
    process.chdir(root);
    lib = await import('@assemblyline/lib-factory');
    intake = (await import(path.join(repo_root, 'src/steps/EX0__intake/EX0_01_intake.js'))).default;
    countWords = (await import(path.join(repo_root, 'src/steps/EX1__count_words/EX1_01_count_words.js'))).default;
  });

  afterAll(() => {
    process.chdir(repo_root);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('seeds one workpiece per sample, once', async () => {
    expect(await run(intake, { source_dir: 'samples' })).toEqual({ seeded_count: 3, skipped_count: 0 });
    expect(await run(intake, { source_dir: 'samples' })).toEqual({ seeded_count: 0, skipped_count: 3 });
    expect(lib.listWorkpieces(lib.bin('EX0', 'output'))).toEqual(['assembly-line', 'empty', 'stations']);
  });

  it('counts words, and sends the empty document to failed', async () => {
    await run(lib.moveFilesStep, { source_bin: 'EX0/output', target_bin: 'EX1/input', batch_size: 10 });
    expect(await run(countWords, {})).toEqual({ done_count: 2, failed_count: 1 });

    const result = JSON.parse(fs.readFileSync(path.join(lib.bin('EX1', 'output'), 'stations', 'result.json'), 'utf8'));
    expect(result).toEqual({ words: 13 });
    expect(lib.listWorkpieces(lib.bin('EX1', 'failed'))).toEqual(['empty']);
    expect(fs.readFileSync(path.join(lib.bin('EX1', 'failed'), 'empty', 'error.txt'), 'utf8')).toMatch(/Empty document/);
  });
});
