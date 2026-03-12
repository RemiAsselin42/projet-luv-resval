/* eslint-disable no-console */
import { getTrackedTextFiles, normalizeFileToLf } from './lf-utils.mjs';

const files = getTrackedTextFiles();
const updatedFiles = [];

for (const filePath of files) {
  if (normalizeFileToLf(filePath)) {
    updatedFiles.push(filePath);
  }
}

if (updatedFiles.length === 0) {
  console.log('Aucune conversion LF necessaire.');
  process.exit(0);
}
console.log(`Conversion LF terminee (${updatedFiles.length} fichiers modifies) :`);
updatedFiles.forEach((filePath) => {
  console.log(`- ${filePath}`);
});
