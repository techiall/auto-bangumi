import { config } from 'dotenv';

config({ path: '.env', quiet: true });
config({ path: '.env.agent', override: true, quiet: true });
