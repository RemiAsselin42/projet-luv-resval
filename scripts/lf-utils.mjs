import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.scss', '.css', '.html', '.md',
  '.yml', '.yaml', '.svg', '.txt', '.env',
]);

const TEXT_FILENAMES = new Set([
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.eslintignore',
  '.eslintrc.cjs',
  '.stylelintrc.json',
]);

const hasTextExtension = (filePath) => {
  const lower = filePath.toLowerCase();
  for (const ext of TEXT_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
};

const isTextFile = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? '';
  if (TEXT_FILENAMES.has(fileName)) {
    return true;
  }
  return hasTextExtension(fileName);
};

export const getTrackedTextFiles = () => {
  const output = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'buffer',
  });

  const allFiles = output
    .toString('utf8')
    .split('\u0000')
    .filter(Boolean);

  return allFiles.filter(isTextFile);
};

export const fileHasCrlf = (relativePath) => {
  const absolutePath = resolve(relativePath);
  const content = readFileSync(absolutePath, 'utf8');
  return content.includes('\r\n') || content.includes('\r');
};

export const normalizeFileToLf = (relativePath) => {
  const absolutePath = resolve(relativePath);
  const content = readFileSync(absolutePath, 'utf8');
  const normalized = content.replace(/\r\n?/g, '\n');
  if (normalized !== content) {
    writeFileSync(absolutePath, normalized, 'utf8');
    return true;
  }
  return false;
};
