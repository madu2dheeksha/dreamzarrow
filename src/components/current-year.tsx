"use cache";

/** Cached so the static shell can include it under Cache Components. */
export async function CurrentYear() {
  return <>{new Date().getFullYear()}</>;
}
