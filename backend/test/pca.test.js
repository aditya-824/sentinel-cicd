import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scorePca } from "../src/pca.js";

const dataFile = (name) =>
  JSON.parse(
    fs.readFileSync(fileURLToPath(new URL(`../data/${name}`, import.meta.url)), "utf8"),
  );

const makeChannel = (id, values, subsystem = "power") => ({
  id,
  displayName: id,
  subsystem,
  anomalies: [],
  points: values.map((value, index) => ({ time: `t${index}`, value })),
});

test("rejects input with fewer than two usable channels", () => {
  assert.throws(
    () => scorePca([makeChannel("only", [1, 2, 3])]),
    /At least two channels/,
  );
});

test("returns the documented result shape", () => {
  const ramp = Array.from({ length: 40 }, (_, i) => i);
  const wave = ramp.map((i) => Math.sin(i / 3));
  const result = scorePca([makeChannel("a", ramp), makeChannel("b", wave)]);
  assert.equal(result.algorithm, "PCA reconstruction error");
  assert.equal(result.featureCount, 2);
  assert.equal(result.sampleCount, 40);
  assert.equal(result.series.length, 40);
  assert.ok(Number.isFinite(result.threshold));
  assert.ok(Number.isFinite(result.currentScore));
});

test("a perfectly correlated pair reconstructs with ~zero error", () => {
  const base = Array.from({ length: 50 }, (_, i) => Math.sin(i / 4) * 10);
  const result = scorePca(
    [makeChannel("x", base), makeChannel("y", base.map((v) => v * 2 + 5))],
    1,
  );
  assert.ok(result.threshold < 1e-3, `threshold was ${result.threshold}`);
});

test("an injected spike produces the highest score", () => {
  const n = 60;
  const base = Array.from({ length: n }, (_, i) => Math.sin(i / 5));
  const spiked = base.map((v, i) => (i === 45 ? v + 25 : v));
  const result = scorePca(
    [makeChannel("a", base), makeChannel("b", spiked), makeChannel("c", base.map((v) => -v))],
    1,
  );
  const top = result.series.reduce((best, p, i, all) =>
    p.value > all[best].value ? i : best, 0);
  assert.equal(top, 45);
});

test("non-numeric points are tolerated", () => {
  const values = Array.from({ length: 30 }, (_, i) => i);
  const dirty = values.map((v, i) => (i % 7 === 0 ? "n/a" : v));
  assert.doesNotThrow(() =>
    scorePca([makeChannel("a", values), { ...makeChannel("b", dirty) }]),
  );
});

for (const file of ["mission-summary.json", "mission2-summary.json"]) {
  test(`scores the real ESA dataset ${file}`, () => {
    const summary = dataFile(file);
    const channels = summary.channels.map((c) => ({ ...c, displayName: c.id }));
    const result = scorePca(channels);
    assert.equal(result.featureCount, summary.channelCount);
    assert.ok(result.components > 0);
    assert.ok(result.threshold > 0);
  });
}
