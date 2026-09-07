import { main } from '../benchmarks/cli.ts';
try { await main(true); } catch (error) { console.error(error); process.exitCode = 1; }
