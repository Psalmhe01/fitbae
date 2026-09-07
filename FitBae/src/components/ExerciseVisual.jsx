import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  Activity,
  Dumbbell,
  PersonStanding,
  RotateCcw,
} from "lucide-react";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import { resolveExercise } from "@/lib/exerciseCatalog";

function textList(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readCatalogValue(entry, camelKey, snakeKey, fallback) {
  return entry?.[camelKey] ?? entry?.[snakeKey] ?? fallback;
}

function buildFormPhases(exercise, catalogExercise) {
  const visualSteps = textList(
    exercise?.visual_steps ??
      readCatalogValue(catalogExercise, "visualSteps", "visual_steps", []),
  );
  const instructions = textList(
    exercise?.instructions ?? catalogExercise?.instructions,
  );
  const steps = visualSteps.length ? visualSteps : instructions;

  return [
    {
      label: "Set up",
      text:
        steps[0] ||
        "Choose a stable position and set the equipment before beginning.",
      icon: PersonStanding,
    },
    {
      label: "Move",
      text:
        steps.length > 2
          ? steps.slice(1, -1).join(" ")
          : steps[1] || "Move through a controlled, comfortable range of motion.",
      icon: Activity,
    },
    {
      label: "Reset",
      text:
        steps.length > 2
          ? steps[steps.length - 1]
          : "Return with control, keep your position, and repeat without rushing.",
      icon: RotateCcw,
    },
  ];
}

/**
 * A local, text-backed movement sequence. It deliberately separates the form
 * guide from optional equipment photography so a stock image is never presented
 * as proof of exercise technique.
 */
export function ExerciseVisual({
  exercise,
  equipmentImageUrl,
  equipmentName,
  compact = false,
  showEquipment = true,
  className,
}) {
  const catalogExercise = resolveExercise(exercise);
  const exerciseName =
    exercise?.name || catalogExercise?.name || "Exercise form guide";
  const movementPattern =
    exercise?.movement_pattern ||
    readCatalogValue(catalogExercise, "movementPattern", "movement_pattern", "");
  const primaryEquipmentId =
    exercise?.equipment_id ||
    exercise?.equipment_ids?.[0] ||
    readCatalogValue(catalogExercise, "equipmentIds", "equipment_ids", [])[0];
  const equipment = primaryEquipmentId
    ? getEquipmentById(primaryEquipmentId)
    : null;
  const referenceUrl = equipmentImageUrl || equipment?.image_url;
  const referenceName =
    equipmentName || equipment?.name || exercise?.equipment || "Equipment";
  const [imageFailed, setImageFailed] = useState(false);
  const phases = useMemo(
    () => buildFormPhases(exercise, catalogExercise),
    [exercise, catalogExercise],
  );

  useEffect(() => setImageFailed(false), [referenceUrl]);

  return (
    <Stack gap={compact ? "sm" : "md"} className={className}>
      <Group justify="space-between" align="center" wrap="wrap">
        <Text fw={700} size={compact ? "sm" : "md"}>
          Form sequence
        </Text>
        {movementPattern && (
          <Badge variant="light" size="sm" tt="capitalize">
            {String(movementPattern).replaceAll("_", " ")}
          </Badge>
        )}
      </Group>

      <SimpleGrid
        component="ol"
        aria-label={`${exerciseName} form sequence`}
        cols={{ base: 1, sm: 3 }}
        spacing="sm"
        m={0}
        p={0}
        style={{ listStyle: "none" }}
      >
        {phases.map(({ label, text, icon: Icon }, index) => (
          <Paper
            component="li"
            key={label}
            p={compact ? "sm" : "md"}
            radius="md"
            withBorder
            style={{ height: "100%" }}
          >
            <Group gap="xs" mb={6} wrap="nowrap">
              <ThemeIcon
                variant="light"
                radius="xl"
                size={compact ? 28 : 34}
                aria-hidden="true"
              >
                <Icon size={compact ? 15 : 18} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  Step {index + 1}
                </Text>
                <Text size="sm" fw={700}>
                  {label}
                </Text>
              </Box>
            </Group>
            <Text size={compact ? "xs" : "sm"} c="dimmed" lh={1.45}>
              {text}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {showEquipment && referenceUrl && (
        <Paper component="figure" m={0} p="sm" radius="md" withBorder>
          <Group align="center" wrap="nowrap">
            {imageFailed ? (
              <ThemeIcon
                size={compact ? 54 : 72}
                radius="md"
                variant="light"
                color="gray"
                aria-hidden="true"
              >
                <Dumbbell size={compact ? 24 : 30} />
              </ThemeIcon>
            ) : (
              <Image
                src={referenceUrl}
                alt={`${referenceName} equipment reference; not a form demonstration`}
                w={compact ? 54 : 72}
                h={compact ? 54 : 72}
                radius="sm"
                fit="cover"
                loading="lazy"
                onError={() => setImageFailed(true)}
                style={{ flexShrink: 0 }}
              />
            )}
            <Box component="figcaption">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Equipment reference
              </Text>
              <Text size="sm" fw={600}>
                {referenceName}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Reference photo only — use the form steps above for the movement.
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

export default ExerciseVisual;
