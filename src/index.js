import 'dotenv/config';
import { startWorker, discoverSteps, createGetHandler } from '@fob/lib-worker';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const steps_dir = join(dirname(fileURLToPath(import.meta.url)), 'steps');
const steps = await discoverSteps(steps_dir);

startWorker({ getHandler: createGetHandler(steps), callerUrl: import.meta.url });
