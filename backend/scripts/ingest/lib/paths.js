import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const PATHS = {
  pdf: process.env.RAMAYANA_PDF || path.join(root, 'data/raw/Valmiki_Ramayana.pdf'),
  pages: path.join(root, 'data/processed/pages.jsonl'),
  chunks: path.join(root, 'data/processed/chunks.jsonl'),
};
