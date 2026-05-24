import { createServiceClient } from "./supabase";

let checked = false;

async function ensureBucket(
  name: string,
  options: { public: boolean; fileSizeLimit: number; allowedMimeTypes?: string[] },
) {
  const service = createServiceClient();
  const { data } = await service.storage.getBucket(name);

  if (data) {
    return;
  }

  const { error } = await service.storage.createBucket(name, {
    public: options.public,
    fileSizeLimit: options.fileSizeLimit,
    allowedMimeTypes: options.allowedMimeTypes,
  });

  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Failed to create storage bucket ${name}: ${error.message}`);
  }
}

export async function ensureStorageBuckets() {
  if (checked) return;

  await ensureBucket("photos", {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  await ensureBucket("blog-markdown", {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["text/markdown", "text/plain"],
  });

  checked = true;
}
