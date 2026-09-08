export const AVATAR_BUCKET = "avatar-photos";
export const MAX_AVATAR_FILE_BYTES = 10 * 1024 * 1024;
export const AVATAR_IMAGE_SIZE = 512;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const AVATAR_PRESETS = Object.freeze([
  { id: "daybreak", name: "Daybreak", icon: "sun", background: "#f7df9b", ink: "#714521", accent: "#eaa552" },
  { id: "botanical", name: "Botanical", icon: "leaf", background: "#dbe6bd", ink: "#344932", accent: "#aebf87" },
  { id: "summit", name: "Summit", icon: "mountain", background: "#d0e2ed", ink: "#314f68", accent: "#91b7c9" },
  { id: "orbit", name: "Orbit", icon: "moon", background: "#e1d7ed", ink: "#51436b", accent: "#b7a4ce" },
  { id: "ember", name: "Ember", icon: "flame", background: "#f3c5ac", ink: "#883e29", accent: "#dfa084" },
  { id: "tide", name: "Tide", icon: "waves", background: "#c5e2db", ink: "#285b53", accent: "#8ec4b7" },
  { id: "heart", name: "Heartbeat", icon: "heart", background: "#f0d0d4", ink: "#8a4252", accent: "#d9a0ab" },
  { id: "strength", name: "Strength", icon: "dumbbell", background: "#e4e4c7", ink: "#494b2b", accent: "#bfc18d" },
]);

export function avatarInitials(name = "") {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => [...part][0]).join("").toLocaleUpperCase() || "F";
}

export function isOwnedAvatarPath(path, userId) {
  return typeof userId === "string" && typeof path === "string"
    && path.startsWith(`${userId}/`)
    && /^[a-zA-Z0-9-]+\/avatar-[a-zA-Z0-9-]+\.(?:jpg|png|webp)$/.test(path);
}

export function normalizeAvatar(value, userId) {
  if (value?.type === "preset" && AVATAR_PRESETS.some((preset) => preset.id === value.id)) {
    return { type: "preset", id: value.id };
  }
  if (value?.type === "upload" && isOwnedAvatarPath(value.path, userId)) {
    return { type: "upload", path: value.path };
  }
  if (value?.type === "initials") return { type: "initials" };
  return { type: "provider" };
}

export function validateAvatarFile(file) {
  if (!file || !AVATAR_MIME_TYPES.includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_AVATAR_FILE_BYTES) {
    throw new Error("Choose a photo smaller than 10 MB.");
  }
}

export function getAvatarCrop(width, height, zoom = 1, horizontal = 50, vertical = 50) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("This photo couldn't be read. Try a different image.");
  }
  const clamp = (value, min, max, fallback) => Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : fallback;
  const size = Math.min(width, height) / clamp(zoom, 1, 3, 1);
  return {
    x: (width - size) * clamp(horizontal, 0, 100, 50) / 100,
    y: (height - size) * clamp(vertical, 0, 100, 50) / 100,
    size,
  };
}

export function drawAvatarCrop(canvas, photo, crop) {
  const rect = getAvatarCrop(photo.naturalWidth, photo.naturalHeight, crop.zoom, crop.horizontal, crop.vertical);
  canvas.width = AVATAR_IMAGE_SIZE;
  canvas.height = AVATAR_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn't prepare this photo.");
  context.fillStyle = "#f3f2e9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(photo, rect.x, rect.y, rect.size, rect.size, 0, 0, canvas.width, canvas.height);
}

export async function prepareAvatarPhoto(photo, crop) {
  const canvas = document.createElement("canvas");
  drawAvatarCrop(canvas, photo, crop);
  // Re-encoding a crop reduces transfer size and omits the original EXIF metadata.
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Your photo couldn't be prepared. Please try again."));
  }, "image/jpeg", 0.88));
}
