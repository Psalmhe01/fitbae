import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarCrop, isOwnedAvatarPath, MAX_AVATAR_FILE_BYTES, normalizeAvatar, validateAvatarFile } from "../src/lib/avatars.js";

test("avatar references cannot escape the owner's storage folder", () => {
  assert.equal(isOwnedAvatarPath("user-one/avatar-123.jpg", "user-one"), true);
  for (const path of ["user-two/avatar-123.jpg", "user-one/../user-two/avatar-123.jpg", "https://example.test/photo.jpg", "user-one/avatar-x.svg"]) {
    assert.equal(isOwnedAvatarPath(path, "user-one"), false);
    assert.equal(normalizeAvatar({ type: "upload", path }, "user-one").type, "provider");
  }
});

test("uploads reject unsupported or oversized files before sending data", () => {
  assert.throws(() => validateAvatarFile({ type: "image/svg+xml", size: 100 }), /JPG, PNG, or WebP/);
  assert.throws(() => validateAvatarFile({ type: "image/png", size: MAX_AVATAR_FILE_BYTES + 1 }), /10 MB/);
  assert.throws(() => validateAvatarFile({ type: "image/jpeg", size: 0 }), /10 MB/);
  assert.doesNotThrow(() => validateAvatarFile({ type: "image/webp", size: 2048 }));
});

test("crop stays inside portrait and landscape photos at all slider extremes", () => {
  for (const [width, height] of [[300, 800], [1200, 400], [512, 512]]) {
    for (const zoom of [1, 1.5, 3, Infinity]) {
      for (const horizontal of [-20, 0, 50, 100, 120]) {
        for (const vertical of [0, 100]) {
          const crop = getAvatarCrop(width, height, zoom, horizontal, vertical);
          assert.ok(crop.x >= 0 && crop.y >= 0 && crop.size > 0);
          assert.ok(crop.x + crop.size <= width + 0.001);
          assert.ok(crop.y + crop.size <= height + 0.001);
        }
      }
    }
  }
});
