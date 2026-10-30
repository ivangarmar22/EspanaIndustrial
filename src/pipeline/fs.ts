import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "./paths";

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");

export async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

/** Writes to a temp file in the same directory and renames it, so readers never see a partial file. */
export async function writeFileAtomic(file: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export const writeJsonAtomic = (file: string, value: unknown) =>
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);

/** Exclusive lock so two pipeline runs (or a run and a manual publish) never interleave. */
export async function withDataLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockFile = paths.lock();
  await mkdir(path.dirname(lockFile), { recursive: true });
  let handle;
  try {
    handle = await open(lockFile, "wx");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Another data operation holds ${lockFile}. If no process is running, delete the file.`);
    }
    throw err;
  }
  try {
    await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`);
    return await fn();
  } finally {
    await handle.close();
    await rm(lockFile, { force: true });
  }
}
