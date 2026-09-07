import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Radio,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  AlertCircle,
  Check,
  Dumbbell,
  RefreshCw,
  Target,
} from "lucide-react";
import {
  getExerciseAlternatives,
  resolveExercise,
} from "@/lib/exerciseCatalog";
import { getEquipmentById } from "@/lib/equipmentLibrary";

export const EXERCISE_SWAP_REASONS = Object.freeze([
  { value: "equipment_unavailable", label: "Equipment is unavailable" },
  { value: "discomfort", label: "Pain or discomfort" },
  { value: "preference", label: "I do not enjoy this exercise" },
  { value: "easier", label: "I need an easier option" },
  { value: "harder", label: "I want a harder option" },
]);

function valueFrom(entry, camelKey, snakeKey, fallback) {
  return entry?.[camelKey] ?? entry?.[snakeKey] ?? fallback;
}

function equipmentNames(exercise) {
  const ids = valueFrom(exercise, "equipmentIds", "equipment_ids", []);
  if (!Array.isArray(ids) || ids.length === 0) return ["No equipment"];
  return ids.map((id) => getEquipmentById(id)?.name || id.replaceAll("_", " "));
}

function AlternativeCard({ exercise, selected, onSelect }) {
  const movement = valueFrom(
    exercise,
    "movementPattern",
    "movement_pattern",
    "Exercise",
  );
  const muscle = valueFrom(
    exercise,
    "primaryMuscle",
    "primary_muscle",
    "General",
  );
  const equipment = equipmentNames(exercise).join(", ");

  return (
    <UnstyledButton
      type="button"
      onClick={() => onSelect(exercise.id)}
      aria-pressed={selected}
      aria-label={`Choose ${exercise.name}, ${muscle}, using ${equipment}`}
      style={{ width: "100%", textAlign: "left", borderRadius: 14 }}
    >
      <Paper
        withBorder
        radius="md"
        p="md"
        style={{
          borderColor: selected
            ? "var(--mantine-color-primary-filled)"
            : undefined,
          background: selected
            ? "var(--mantine-color-primary-light)"
            : undefined,
          transition: "border-color 120ms ease, background-color 120ms ease",
        }}
      >
        <Group align="flex-start" wrap="nowrap">
          <ThemeIcon
            variant={selected ? "filled" : "light"}
            radius="xl"
            size="lg"
            aria-hidden="true"
          >
            {selected ? <Check size={18} /> : <Dumbbell size={18} />}
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Text fw={700} size="sm">
                {exercise.name}
              </Text>
              {exercise.difficulty && (
                <Badge variant="outline" color="gray" size="xs" tt="capitalize">
                  {exercise.difficulty}
                </Badge>
              )}
            </Group>
            <Group gap={6} mt={6} wrap="wrap">
              <Badge
                variant="light"
                size="xs"
                leftSection={<Target size={10} aria-hidden="true" />}
              >
                {muscle}
              </Badge>
              <Badge variant="outline" size="xs" tt="capitalize">
                {String(movement).replaceAll("_", " ")}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              {equipment}
            </Text>
          </Box>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

/**
 * Presents deterministic, equipment-compatible alternatives. `onSelect` receives
 * the selected catalog exercise as its first argument and substitution metadata
 * as its second argument.
 */
export function ExerciseSwapModal({
  opened,
  onClose,
  exercise,
  selectedEquipment = null,
  onSelect,
  maxOptions = 6,
  initialReason = "equipment_unavailable",
  title = "Swap exercise",
}) {
  const currentExercise = resolveExercise(exercise);
  const alternatives = useMemo(
    () =>
      currentExercise
        ? getExerciseAlternatives(currentExercise, selectedEquipment, {
            limit: Math.max(1, Math.min(12, Number(maxOptions) || 6)),
            sameMovement: true,
            sameMuscle: true,
          })
        : [],
    [currentExercise, selectedEquipment, maxOptions],
  );
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState(initialReason);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!opened) return;
    setSelectedId(null);
    setReason(initialReason);
    setSubmitError("");
  }, [opened, exercise, initialReason]);

  const selected = alternatives.find((candidate) => candidate.id === selectedId);

  const handleConfirm = async () => {
    if (!selected || !onSelect || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await onSelect(selected, {
        reason,
        original: currentExercise || exercise,
      });
      if (result !== false) onClose?.();
    } catch (error) {
      setSubmitError(error?.message || "The exercise could not be swapped.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="lg"
      radius="lg"
      overlayProps={{ backgroundOpacity: 0.68, blur: 3 }}
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      withCloseButton={!submitting}
    >
      <Stack gap="lg">
        <Box>
          <Text size="sm" fw={700}>
            Replace {exercise?.name || currentExercise?.name || "this exercise"}
          </Text>
          <Text size="sm" c="dimmed" mt={3}>
            These options use the same movement pattern and primary muscle, then
            filter against your available equipment.
          </Text>
        </Box>

        <Radio.Group
          value={reason}
          onChange={setReason}
          name="exercise-swap-reason"
          label="Why are you swapping it?"
        >
          <Stack gap="xs" mt="xs">
            {EXERCISE_SWAP_REASONS.map((item) => (
              <Radio key={item.value} value={item.value} label={item.label} />
            ))}
          </Stack>
        </Radio.Group>

        {reason === "discomfort" && (
          <Alert
            icon={<AlertCircle size={18} />}
            color="orange"
            variant="light"
            title="Do not train through sharp pain"
          >
            A swap is not medical advice. Stop the movement and seek qualified help
            if pain is sudden, severe, or persistent.
          </Alert>
        )}

        <Box>
          <Text size="sm" fw={700} mb="xs" id="swap-options-label">
            Compatible alternatives
          </Text>
          {alternatives.length > 0 ? (
            <ScrollArea.Autosize mah={360} type="auto" offsetScrollbars>
              <Stack gap="sm" role="group" aria-labelledby="swap-options-label" pr={4}>
                {alternatives.map((alternative) => (
                  <AlternativeCard
                    key={alternative.id}
                    exercise={alternative}
                    selected={alternative.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          ) : (
            <Paper withBorder radius="md" p="lg">
              <Text fw={700} size="sm">
                No compatible alternatives found
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Update available equipment or keep the current exercise. A broader
                replacement should be reviewed before changing the workout stimulus.
              </Text>
            </Paper>
          )}
        </Box>

        {submitError && (
          <Alert icon={<AlertCircle size={18} />} color="red" variant="light">
            {submitError}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || !onSelect}
            loading={submitting}
            leftSection={<RefreshCw size={16} aria-hidden="true" />}
          >
            Use {selected?.name || "selected exercise"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExerciseSwapModal;
