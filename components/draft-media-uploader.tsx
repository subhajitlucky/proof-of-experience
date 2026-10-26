"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_RECORD,
} from "@/lib/media-constants";

export function DraftMediaUploader({
  experienceId,
  currentCount,
}: {
  experienceId: string;
  currentCount: number;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const remaining = MAX_IMAGES_PER_RECORD - currentCount;

  if (remaining <= 0) {
    return (
      <p className="mt-4 text-[11px] text-faint">
        This draft has reached the media limit of {MAX_IMAGES_PER_RECORD} images.
      </p>
    );
  }

  async function upload() {
    if (files.length === 0) return;
    setError(null);
    setMessage(null);
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of files) form.append("images", file);
      if (currentCount === 0) form.set("coverIndex", "0");
      const response = await fetch(
        `/api/experiences/${experienceId}/media`,
        { method: "POST", body: form },
      );
      const payload = (await response.json().catch(() => null)) as
        | { data?: { count?: number }; error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "The images could not be uploaded.");
        return;
      }
      setFiles([]);
      setMessage("Images hashed, stored and added to the draft.");
      router.refresh();
    } catch {
      setError("The images could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-5 border border-dashed border-rule-dark bg-paper-raised p-4">
      <p className="eyebrow">Add to draft</p>
      <p className="mt-2 text-[11px] leading-5 text-muted">
        Attach up to {remaining} more image{remaining === 1 ? "" : "s"}. JPEG, PNG
        or WebP, 8 MB each. Metadata is stripped before storage and hashing.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="btn btn--outline btn--sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          Choose images
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              const issues: string[] = [];
              const accepted = Array.from(event.target.files ?? [])
                .filter((file) => {
                  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                    issues.push(`${file.name} is not a JPEG, PNG or WebP image.`);
                    return false;
                  }
                  if (file.size > MAX_IMAGE_BYTES) {
                    issues.push(`${file.name} is larger than 8 MB.`);
                    return false;
                  }
                  return true;
                })
                .slice(0, remaining);
              setFiles(accepted);
              setMessage(null);
              setError(issues.length > 0 ? issues.join(" ") : null);
              event.target.value = "";
            }}
          />
        </label>
        <button
          className="btn btn--primary btn--sm"
          type="button"
          disabled={uploading || files.length === 0}
          onClick={() => void upload()}
        >
          {uploading ? "Hashing and uploading…" : "Upload to draft"}
        </button>
        <span className="text-[10px] text-faint">
          {files.length > 0
            ? `${files.length} file${files.length === 1 ? "" : "s"} ready`
            : "No files chosen"}
        </span>
      </div>
      {error ? (
        <p className="form-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-[11px] text-ink-soft" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
