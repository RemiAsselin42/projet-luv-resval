/* eslint-disable no-console */
import { fileHasCrlf, getTrackedTextFiles } from './lf-utils.mjs';

const files = getTrackedTextFiles();
const offenders = files.filter(fileHasCrlf);

if (offenders.length > 0) {
  console.error('CRLF detecte dans les fichiers suivants :');
  offenders.forEach((filePath) => {
    console.error(`- ${filePath}`);
  });
  console.error('Lancez "npm run lf:fix" pour normaliser en LF.');
  process.exit(1);
}

console.log(`LF check OK (${files.length} fichiers texte verifies).`);
