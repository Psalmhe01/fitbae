import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  RefreshCw,
  Target,
} from "lucide-react";
import { resolveExercise } from "@/lib/exerciseCatalog";
import { ExerciseVisual } from "./ExerciseVisual";

function list(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function valueFrom(entry, camelKey, snakeKey, fallback) {
  return entry?.[camelKey] ?? entry?.[snakeKey] ?? fallback;
}

export function getExerciseDemoSearchUrl(exercise) {
  const catalogExercise = resolveExercise(exercise);
  const name = exercise?.name || catalogExercise?.name || "exercise";
  const query = encodeURIComponent(`${name} proper form demonstration`);
  return `https://www.google.com/search?q=${query}`;
}

function GuidanceList({ title, items, tone = "positive" }) {
  if (!items.length) return null;
  const negative = tone === "caution";

  return (
    <Box>
      <Group gap="xs" mb="xs">
        <ThemeIcon
          size="sm"
          radius="xl"
          variant="light"
          color={negative ? "orange" : "green"}
          aria-hidden="true"
        >
          {negative ? <AlertTriangle size={13} /> : <Check size={13} />}
        </ThemeIcon>
        <Text fw={700} size="sm">
          {title}
        </Text>
      </Group>
      <Stack component="ul" gap={6} m={0} pl="lg">
        {items.map((item, index) => (
          <Text component="li" key={`${item}-${index}`} size="sm" c="dimmed">
            {item}
          </Text>
        ))}
      </Stack>
    </Box>
  );
}

/** Accessible detail modal for generated or catalog-backed exercises. */
export function ExerciseGuideModal({
  opened,
  onClose,
  exercise,
  equipmentImageUrl,
  equipmentName,
  onRequestSwap,
  externalSearchUrl,
  showSafetyNote = true,
}) {
  const catalogExercise = resolveExercise(exercise);
  const name = exercise?.name || catalogExercise?.name || "Exercise guide";
  const movementPattern =
    exercise?.movement_pattern ||
    valueFrom(catalogExercise, "movementPattern", "movement_pattern", "");
  const primaryMuscle =
    exercise?.muscle_group ||
    valueFrom(catalogExercise, "primaryMuscle", "primary_muscle", "");
  const difficulty = exercise?.difficulty || catalogExercise?.difficulty;
  const instructions = list(
    exercise?.instructions ?? catalogExercise?.instructions,
  );
  const cues = list(
    exercise?.cues ?? exercise?.form_cues ?? catalogExercise?.cues,
  );
  const commonMistakes = list(
    exercise?.common_mistakes ??
      valueFrom(catalogExercise, "commonMistakes", "common_mistakes", []),
  );
  const demoUrl = externalSearchUrl || getExerciseDemoSearchUrl(exercise);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={name}
      centered
      size="lg"
      radius="lg"
      scrollAreaComponent={undefined}
      overlayProps={{ backgroundOpacity: 0.68, blur: 3 }}
    >
      <Stack gap="lg">
        <Group gap="xs" wrap="wrap" aria-label="Exercise classification">
          {primaryMuscle && (
            <Badge variant="light" leftSection={<Target size={12} />}>
              {primaryMuscle}
            </Badge>
          )}
          {movementPattern && (
            <Badge variant="outline" tt="capitalize">
              {String(movementPattern).replaceAll("_", " ")}
            </Badge>
          )}
          {difficulty && (
            <Badge variant="outline" color="gray" tt="capitalize">
              {difficulty}
            </Badge>
          )}
        </Group>

        <ExerciseVisual
          exercise={exercise || catalogExercise}
          equipmentImageUrl={equipmentImageUrl}
          equipmentName={equipmentName}
        />

        {instructions.length > 0 && (
          <Box>
            <Text fw={700} size="sm" mb="xs">
              Detailed steps
            </Text>
            <Stack component="ol" gap="xs" m={0} pl="xl">
              {instructions.map((step, index) => (
                <Text component="li" key={`${step}-${index}`} size="sm" lh={1.5}>
                  {step}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {(cues.length > 0 || commonMistakes.length > 0) && <Divider />}

        <Group align="flex-start" grow preventGrowOverflow={false}>
          <GuidanceList title="Useful cues" items={cues} />
          <GuidanceList
            title="Common mistakes"
            items={commonMistakes}
            tone="caution"
          />
        </Group>

        {exercise?.note && (
          <Paper withBorder radius="md" p="md">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>
              Coach note
            </Text>
            <Text size="sm">{exercise.note}</Text>
          </Paper>
        )}

        {showSafetyNote && (
          <Alert
            icon={<AlertTriangle size={18} />}
            color="orange"
            variant="light"
            title="Move within a comfortable range"
          >
            Stop if you feel sharp pain, dizziness, or unusual discomfort. Ask a
            qualified professional for help when you are unsure about setup or form.
          </Alert>
        )}

        <Group justify="space-between" align="center" wrap="wrap">
          <Anchor
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            aria-label={`Search for a ${name} form demonstration; opens in a new tab`}
          >
            <Group component="span" gap={6} wrap="nowrap">
              <ExternalLink size={15} aria-hidden="true" />
              Search for a form demonstration
            </Group>
          </Anchor>

          <Group gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Close
            </Button>
            {onRequestSwap && (
              <Button
                variant="light"
                leftSection={<RefreshCw size={16} aria-hidden="true" />}
                onClick={() => onRequestSwap(exercise || catalogExercise)}
              >
                Swap exercise
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

export default ExerciseGuideModal;
