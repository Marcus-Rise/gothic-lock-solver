import { main } from './cli.ts';
try { await main(); } catch (error) { console.error(error); process.exitCode = 1; }
