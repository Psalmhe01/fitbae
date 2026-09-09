import { test } from "node:test";
import assert from "node:assert/strict";
import { animateContent } from "../src/lib/motion.js";

test("content stays usable without animation support or with reduced motion", () => {
  assert.doesNotThrow(() => animateContent(null)());
  assert.doesNotThrow(() => animateContent({})());
  let calls = 0;
  animateContent({ animate() { calls++; } }, "rise", { matches: true })();
  assert.equal(calls, 0);
});

test("page transitions never transform the ancestor of fixed controls", () => {
  let frames, options, cancelled = false;
  const cleanup = animateContent({ animate(f, o) { frames = f; options = o; return { cancel() { cancelled = true; } }; } }, "fade", { matches: false });
  assert.equal(frames.some((frame) => "transform" in frame), false);
  assert.equal(options.fill, "none");
  assert.ok(options.duration <= 250);
  cleanup();
  assert.equal(cancelled, true);
});

test("enabling reduced motion cancels an in-flight animation and cleans its listener", () => {
  let listener, removed = 0, cancelled = 0;
  const media = { matches: false, addEventListener(_name, fn) { listener = fn; }, removeEventListener(_name, fn) { assert.equal(fn, listener); removed++; } };
  const cleanup = animateContent({ animate() { return { cancel() { cancelled++; } }; } }, "rise", media);
  listener({ matches: true });
  assert.equal(cancelled, 1);
  cleanup();
  assert.equal(removed, 1);
});

test("a WebView animation failure does not prevent rendering", () => {
  assert.doesNotThrow(() => animateContent({ animate() { throw new Error("unsupported"); } }, "rise", { matches: false })());
});
