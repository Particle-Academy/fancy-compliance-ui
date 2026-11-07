import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// vitest runs from the package root; under jsdom import.meta.url is not a file URL.
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

describe("package.json", () => {
  it("peers react-fancy 6.9 or later within 6.x, and React 19", () => {
    expect(pkg.peerDependencies).toEqual({
      "@particle-academy/react-fancy": ">=6.9.0 <7.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    });
  });

  it("has no runtime dependencies of its own", () => {
    expect(pkg.dependencies).toBeUndefined();
  });

  it("ships the changelog and readme", () => {
    expect(pkg.files).toEqual(expect.arrayContaining(["dist", "README.md", "CHANGELOG.md"]));
  });

  // The agent fence is a plain data attribute (tests/agent-off-limits.test.tsx).
  // It must stay that way: this package imports neither Inertia nor agent-integrations.
  it("no source imports agent-integrations", () => {
    for (const file of readdirSync(join(process.cwd(), "src"))) {
      const src = readFileSync(join(process.cwd(), "src", file), "utf8");
      expect(src, file).not.toMatch(/from\s+["']@particle-academy\/agent-integrations/);
    }
  });
});
