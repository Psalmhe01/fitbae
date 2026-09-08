import { useEffect, useState } from "react";
import { Avatar } from "@mantine/core";
import { Dumbbell, Flame, Heart, Leaf, Moon, Mountain, Sun, Waves } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AVATAR_BUCKET, AVATAR_PRESETS, avatarInitials, normalizeAvatar } from "@/lib/avatars";

const icons = { sun: Sun, leaf: Leaf, mountain: Mountain, moon: Moon, flame: Flame, waves: Waves, heart: Heart, dumbbell: Dumbbell };

export function ProfileAvatar({ user, name, choice, size = 48, radius = "xl", ...props }) {
  const avatar = normalizeAvatar(choice ?? user?.user_metadata?.fitbae_avatar, user?.id);
  const [signedPhoto, setSignedPhoto] = useState(null);
  const path = avatar.type === "upload" ? avatar.path : null;

  useEffect(() => {
    if (!path) return undefined;
    let active = true;
    const sign = async () => {
      try {
        const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 300);
        if (active) setSignedPhoto(error ? null : { path, url: data.signedUrl });
      } catch {
        if (active) setSignedPhoto(null);
      }
    };
    sign();
    const timer = window.setInterval(sign, 240_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [path]);

  const preset = avatar.type === "preset" ? AVATAR_PRESETS.find((item) => item.id === avatar.id) : null;
  const Icon = preset ? icons[preset.icon] : null;
  const provider = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const src = avatar.type === "provider" && /^https:\/\//i.test(provider || "") ? provider
    : signedPhoto?.path === path && path ? signedPhoto.url : undefined;

  return (
    <Avatar
      src={src}
      alt={`${name || "Your"} profile picture`}
      size={size}
      radius={radius}
      color="brand"
      styles={preset ? { placeholder: { background: preset.background, color: preset.ink } } : undefined}
      {...props}
    >
      {preset ? (
        <span className="avatar-art" role="img" aria-label={`${preset.name} avatar`} style={{ "--avatar-accent": preset.accent }}>
          <Icon size="48%" strokeWidth={1.65} aria-hidden="true" />
        </span>
      ) : avatarInitials(name || user?.email)}
    </Avatar>
  );
}
