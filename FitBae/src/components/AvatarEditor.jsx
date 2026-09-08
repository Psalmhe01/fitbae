import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Divider, FileButton, Group, Modal, Paper,
  SimpleGrid, Slider, Stack, Text, Title, UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Camera, Check, ImagePlus, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AVATAR_BUCKET, AVATAR_PRESETS, drawAvatarCrop, isOwnedAvatarPath,
  normalizeAvatar, prepareAvatarPhoto, validateAvatarFile,
} from "@/lib/avatars";
import { ProfileAvatar } from "./ProfileAvatar";

const DEFAULT_CROP = { zoom: 1, horizontal: 50, vertical: 50 };

export function AvatarEditor({ user, name, onUserChange }) {
  const [opened, setOpened] = useState(false);
  const [choice, setChoice] = useState(() => normalizeAvatar(user?.user_metadata?.fitbae_avatar, user?.id));
  const [photo, setPhoto] = useState(null);
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [error, setError] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);
  const fileReset = useRef(null);
  const fileRequest = useRef(0);
  const saveLock = useRef(false);

  useEffect(() => () => { fileRequest.current += 1; }, []);

  useEffect(() => {
    if (!photo || !previewRef.current) return;
    try { drawAvatarCrop(previewRef.current, photo, crop); }
    catch (drawError) { setError(drawError.message); }
  }, [photo, crop]);

  const openEditor = () => {
    setChoice(normalizeAvatar(user?.user_metadata?.fitbae_avatar, user?.id));
    setPhoto(null);
    setCrop(DEFAULT_CROP);
    setError("");
    setOpened(true);
  };

  const closeEditor = () => {
    if (saveLock.current) return;
    fileRequest.current += 1;
    setLoadingPhoto(false);
    setOpened(false);
    setPhoto(null);
  };

  const chooseAvatar = (next) => {
    fileRequest.current += 1;
    setLoadingPhoto(false);
    setChoice(next);
    setPhoto(null);
    setError("");
  };

  const loadPhoto = async (file) => {
    if (!file) return;
    const request = ++fileRequest.current;
    setError("");
    setLoadingPhoto(true);
    let objectUrl;
    try {
      validateAvatarFile(file);
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (request !== fileRequest.current) return;
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 60_000_000) {
        throw new Error("Choose a smaller photo, up to 60 megapixels.");
      }
      setPhoto(image);
      setCrop(DEFAULT_CROP);
    } catch (photoError) {
      if (request === fileRequest.current) setError(photoError.message || "This photo couldn't be opened.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (request === fileRequest.current) setLoadingPhoto(false);
      fileReset.current?.();
    }
  };

  const savePicture = async () => {
    if (saveLock.current || loadingPhoto) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    let uploadedPath;
    let committed = false;
    try {
      let nextAvatar = choice;
      if (photo) {
        const blob = await prepareAvatarPhoto(photo, crop);
        const path = `${user.id}/avatar-${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
          contentType: "image/jpeg", cacheControl: "300", upsert: false,
        });
        if (uploadError) throw new Error("Your photo couldn't be uploaded. Try again, or choose a built-in avatar.");
        uploadedPath = path;
        nextAvatar = { type: "upload", path };
      }
      const { data, error: updateError } = await supabase.auth.updateUser({ data: { fitbae_avatar: nextAvatar } });
      if (updateError) throw updateError;
      if (!data.user) throw new Error("Your picture couldn't be saved. Sign in again and retry.");
      committed = true;
      onUserChange?.(data.user);
      setOpened(false);
      setPhoto(null);
      notifications.show({ title: "Profile picture updated", color: "green" });

      const previous = normalizeAvatar(user.user_metadata?.fitbae_avatar, user.id);
      if (previous.type === "upload" && previous.path !== nextAvatar.path && isOwnedAvatarPath(previous.path, user.id)) {
        // Only remove the replaced photo after the new choice is saved.
        await supabase.storage.from(AVATAR_BUCKET).remove([previous.path]).catch(() => {});
      }
    } catch (saveError) {
      if (uploadedPath && !committed) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]).catch(() => {});
      }
      setError(saveError.message || "Your picture couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  return (
    <>
      <Paper className="surface-raised" p={{ base: "lg", md: "xl" }}>
        <Group justify="space-between" gap="lg">
          <Group gap="lg" wrap="nowrap">
            <ProfileAvatar user={user} name={name} size={84} radius={26} />
            <Box><Text className="eyebrow">Make it yours</Text><Title order={2} fz="xl" mt={4}>Profile picture</Title><Text size="sm" c="dimmed" mt={4}>Pick an avatar or bring your own photo.</Text></Box>
          </Group>
          <Button variant="light" leftSection={<Camera size={17} />} onClick={openEditor}>Change picture</Button>
        </Group>
      </Paper>

      <Modal opened={opened} onClose={closeEditor} title="Choose your profile picture" size="lg" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        <Stack gap="md">
          <Box className="avatar-preview-panel">
            {photo ? <canvas ref={previewRef} className="avatar-crop-preview" role="img" aria-label="Cropped profile photo preview" />
              : <ProfileAvatar user={user} name={name} choice={choice} size={112} radius="50%" />}
            <Text fw={750} mt="sm">{name || "Your profile"}</Text>
            <Text size="xs" c="dimmed">Preview your picture before saving.</Text>
          </Box>

          {photo && (
            <Stack gap="md" px="sm">
              <CropSlider label="Zoom" min={1} max={3} step={0.05} value={crop.zoom} disabled={saving} onChange={(zoom) => setCrop((value) => ({ ...value, zoom }))} />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                <CropSlider label="Horizontal position" min={0} max={100} value={crop.horizontal} disabled={saving} onChange={(horizontal) => setCrop((value) => ({ ...value, horizontal }))} />
                <CropSlider label="Vertical position" min={0} max={100} value={crop.vertical} disabled={saving} onChange={(vertical) => setCrop((value) => ({ ...value, vertical }))} />
              </SimpleGrid>
              <Button variant="subtle" color="gray" size="xs" onClick={() => setCrop(DEFAULT_CROP)} disabled={saving} leftSection={<RotateCcw size={14} />}>Reset crop</Button>
            </Stack>
          )}

          <Group justify="space-between">
            <FileButton accept="image/jpeg,image/png,image/webp" onChange={loadPhoto} resetRef={fileReset}>
              {(props) => <Button {...props} variant="light" color="gray" leftSection={<ImagePlus size={17} />} loading={loadingPhoto} disabled={saving}>{photo ? "Choose another photo" : "Upload a photo"}</Button>}
            </FileButton>
            <Text size="xs" c="dimmed">JPG, PNG or WebP · up to 10 MB</Text>
          </Group>

          <Divider label="Or choose an avatar" />
          <SimpleGrid cols={4} spacing="sm" role="group" aria-label="Built-in avatars">
            {AVATAR_PRESETS.map((preset) => {
              const selected = !photo && choice.type === "preset" && choice.id === preset.id;
              return (
                <UnstyledButton key={preset.id} className="avatar-option" data-selected={selected} aria-pressed={selected} aria-label={`Choose ${preset.name} avatar`} disabled={saving} onClick={() => chooseAvatar({ type: "preset", id: preset.id })}>
                  <ProfileAvatar choice={{ type: "preset", id: preset.id }} size={58} />
                  <Text size="xs" fw={700} mt={7}>{preset.name}</Text>
                  {selected && <Check size={15} className="avatar-option-check" aria-hidden="true" />}
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
          <Group gap="xs">
            <Button variant="subtle" color="gray" size="xs" disabled={saving} onClick={() => chooseAvatar({ type: "initials" })}>Use my initials</Button>
            {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture) && <Button variant="subtle" color="gray" size="xs" disabled={saving} onClick={() => chooseAvatar({ type: "provider" })}>Use Google photo</Button>}
          </Group>
          {error && <Alert color="red" role="alert">{error}</Alert>}
          <Group justify="flex-end" className="avatar-editor-actions"><Button variant="subtle" color="gray" onClick={closeEditor} disabled={saving}>Cancel</Button><Button onClick={savePicture} loading={saving} disabled={loadingPhoto} leftSection={<Check size={16} />}>Save picture</Button></Group>
        </Stack>
      </Modal>
    </>
  );
}

function CropSlider({ label, ...props }) {
  return <Box><Text size="xs" fw={700} mb={6}>{label}</Text><Slider {...props} aria-label={label} thumbLabel={label} /></Box>;
}
