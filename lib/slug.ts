import { randomBytes } from "node:crypto";

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "record";
}

export function candidateSlug(title: string): string {
  return `${slugify(title).slice(0, 80)}-${randomBytes(4).toString("hex")}`;
}

export async function ensureUniqueSlug(
  find: (slug: string) => Promise<{ id: string } | null>,
  title: string,
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = candidateSlug(title);
    const existing = await find(slug);
    if (!existing) return slug;
  }
  return `${slugify(title).slice(0, 60)}-${randomBytes(8).toString("hex")}`;
}
