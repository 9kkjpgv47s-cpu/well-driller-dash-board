import { redirect } from "next/navigation";

type Search = { [key: string]: string | string[] | undefined };

/** Field workspace lives on `/` (mono page). Keep `/drilling` for bookmarks. */
export default async function DrillingRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string" && val) qs.set(key, val);
  }
  redirect(qs.toString() ? `/?${qs}` : "/");
}
