import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { navItems } from "../src/data/navigation.js";

const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("navigation paths are unique and absolute", () => {
  const paths = navItems.map((item) => item.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const path of paths) assert.match(path, /^\/[a-z-]+$/);
});

test("every navigation item has a matching <Route> in App.jsx", () => {
  for (const { path } of navItems) {
    assert.ok(
      app.includes(`path="${path.slice(1)}"`),
      `No <Route path="${path.slice(1)}"> found for nav item ${path}`,
    );
  }
});

test("every navigation item has a label", () => {
  for (const item of navItems) assert.ok(item.label.trim().length > 0);
});
