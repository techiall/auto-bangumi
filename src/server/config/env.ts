import { config } from 'dotenv';

config({ path: '.env', quiet: true });
config({ path: '.env.server', override: true, quiet: true });
