import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

function localRoot(): string {
  const configured = process.env.STORAGE_LOCAL_DIR || "./.data/uploads";
  return resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function safeLocalPath(key: string): string {
  const root = localRoot();
  const candidate = resolve(/* turbopackIgnore: true */ root, key);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error("Invalid storage key");
  }
  return candidate;
}

class LocalStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer): Promise<void> {
    const path = safeLocalPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { mode: 0o640 });
  }

  async get(key: string): Promise<Buffer> {
    return readFile(safeLocalPath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(safeLocalPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

class S3StorageAdapter implements StorageAdapter {
  private bucket = process.env.S3_BUCKET;

  private async client() {
    if (
      !process.env.S3_BUCKET ||
      !process.env.S3_REGION ||
      !process.env.S3_ACCESS_KEY_ID ||
      !process.env.S3_SECRET_ACCESS_KEY
    ) {
      throw new Error("S3 storage is selected but the S3 environment is incomplete");
    }
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.client();
    await s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "private, max-age=0, must-revalidate",
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.client();
    const result = await s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error("Object not found");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.client();
    await s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter =
      (process.env.STORAGE_DRIVER || "local").toLowerCase() === "s3"
        ? new S3StorageAdapter()
        : new LocalStorageAdapter();
  }
  return adapter;
}

export async function deleteStoredFiles(keys: string[]): Promise<void> {
  const storage = getStorage();
  await Promise.all(
    keys.map(async (key) => {
      try {
        await storage.delete(key);
      } catch (error) {
        console.error("Could not delete stored file", key, error);
      }
    }),
  );
}
