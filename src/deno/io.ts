export function safeStatSync(path: string | URL): Deno.FileInfo | undefined {
  try {
    return Deno.statSync(path);
  } catch {
    return undefined;
  }
}
