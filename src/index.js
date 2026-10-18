// @ts-check
import 'dotenv/config';
import { startFactory, startBinWatcher, discoverSteps, createGetHandler, moveFilesStep } from '@assemblyline/lib-factory';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const steps_dir = join(dirname(fileURLToPath(import.meta.url)), 'steps');
const discovered = await discoverSteps(steps_dir);
const steps = {
  ...discovered,
  [moveFilesStep.slug]: moveFilesStep,
};

startFactory({ getHandler: createGetHandler(steps), callerUrl: import.meta.url });
startBinWatcher();
