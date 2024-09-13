import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { safeStatSync } from "./io.ts";
import { join } from "@std/path/join";

interface Context {
  root: string;
}

describe("safeStatSync", () => {
  beforeEach<Context>(async function () {
    this.root = await Deno.makeTempDir();
  });

  afterEach<Context>(async function () {
    await Deno.remove(this.root, { recursive: true });
  });

  it<Context>("should return undefined", function () {
    const path = join(this.root, "not-found");

    expect(safeStatSync(path)).toBe(undefined);
  });

  it<Context>("should return stat", function () {
    expect(safeStatSync(this.root)).toBeTruthy();
  });
});
