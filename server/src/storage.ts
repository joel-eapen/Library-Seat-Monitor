import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

export async function writeJsonFile(
  filePath: string,
  value: unknown
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
  );
  await rename(temporaryPath, filePath);
}
