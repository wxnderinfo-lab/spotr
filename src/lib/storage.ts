// Publieke URL's voor openbare buckets (avatars, portfolio, opdrachtfoto's).
// Chatbijlagen zijn privé en gaan altijd via een kortlevende signed URL.
export function publicUrl(bucket: "avatars" | "portfolio" | "job-media", path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
