import { main } from '../benchmarks/cli.ts';
try { await main(false); } catch (error) { console.error(error); process.exitCode = 1; }
