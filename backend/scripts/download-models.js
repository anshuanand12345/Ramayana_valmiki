/** Pre-download the local embedding model (run at build time so cold starts stay fast). */
import { embeddingService } from '../src/services/embedding/embedding.service.js';

await embeddingService.warmup();
console.log('embedding model ready');
