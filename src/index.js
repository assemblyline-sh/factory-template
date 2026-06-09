import 'dotenv/config';
import { startWorker, discoverSteps, createGetHandler, moveFilesStep, splitBundlesStep } from '@fob/lib-worker';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const steps_dir = join(dirname(fileURLToPath(import.meta.url)), 'steps');
const discovered = await discoverSteps(steps_dir);
const steps = {
  ...discovered,
  [moveFilesStep.slug]: moveFilesStep,
  [splitBundlesStep.slug]: splitBundlesStep,
};

startWorker({ getHandler: createGetHandler(steps), callerUrl: import.meta.url });
