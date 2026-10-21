import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../data/", import.meta.url));
const summaries = fs.readdirSync(dir).filter((f) => f.endsWith("-summary.json"));

test("at least one seed summary exists", () => {
  assert.ok(summaries.length >= 1);
});

for (const file of summaries) {
  test(`${file}: seed data is internally consistent`, () => {
    const summary = JSON.parse(fs.readFileSync(dir + file, "utf8"));
    assert.equal(summary.channels.length, summary.channelCount);
    const ids = summary.channels.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, "channel ids must be unique");
    for (const channel of summary.channels) {
      assert.ok(channel.subsystem, `${channel.id} needs a subsystem`);
      assert.ok(Array.isArray(channel.points), `${channel.id} needs points`);
    }
  });
}
