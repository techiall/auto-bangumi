import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

config({ path: path.join(agentRoot, '.env'), quiet: true });
