import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ActionIcon, Alert, Badge, Box, Button, Checkbox, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { BookOpen, Search, Star } from "lucide-react";
import { EXERCISE_CATALOG, searchExercises } from "@/lib/exerciseCatalog";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import { ExerciseGuideModal } from "@/components/ExerciseGuideModal";

export default function LibraryPage() {
  const { profile, session } = useOutletContext();
  const key = `fitbae-favorite-exercises:${session.user.id}`;
  const [favorites, setFavorites] = useState(() => { try { const stored = JSON.parse(localStorage.getItem(key)); return Array.isArray(stored) ? stored.filter((id) => EXERCISE_CATALOG.some((exercise) => exercise.id === id)) : []; } catch { return []; } });
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [available, setAvailable] = useState(true);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [guide, setGuide] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const muscles = useMemo(() => [...new Set(EXERCISE_CATALOG.map((exercise) => exercise.primaryMuscle))].sort().map((value) => ({ value, label: value.replaceAll("_", " ") })), []);
  const results = useMemo(() => searchExercises(query, { selectedEquipment: available ? profile.equipment : null, primaryMuscle: muscle || undefined, difficulty: difficulty || undefined, limit: 200 }).filter((exercise) => !onlyFavorites || favorites.includes(exercise.id)), [available, difficulty, favorites, muscle, onlyFavorites, profile.equipment, query]);
  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  };
  return <Stack gap="xl">
    <Box><Text className="eyebrow">Know your next movement</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2}>Exercise library</Title><Text c="dimmed" mt="xs">Browse form guides, discover compatible movements, and save your go-to exercises on this device.</Text></Box>
    <Paper className="surface" p="lg"><Stack>
      <TextInput label="Search exercises" placeholder="Try squat, chest, or dumbbell" leftSection={<Search size={17} />} value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Muscle group" placeholder="All muscles" clearable searchable data={muscles} value={muscle} onChange={setMuscle} /><Select label="Difficulty" placeholder="All levels" clearable data={["beginner", "intermediate", "advanced"]} value={difficulty} onChange={setDifficulty} /></SimpleGrid>
      <Group><Checkbox label="Only my available equipment" checked={available} onChange={(e) => setAvailable(e.currentTarget.checked)} /><Checkbox label="Only favorites" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.currentTarget.checked)} /></Group>
    </Stack></Paper>
    {storageError && <Alert color="orange">Favorites are available for this visit, but your browser couldn't save them on this device.</Alert>}
    <Text size="sm" c="dimmed">{results.length} exercises · These guides don't replace individual coaching.</Text>
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="lg">
      {results.map((exercise) => <Paper key={exercise.id} className="surface-raised" p="lg"><Stack h="100%">
        <Group justify="space-between" wrap="nowrap"><Badge variant="light" tt="capitalize">{exercise.primaryMuscle.replaceAll("_", " ")}</Badge><ActionIcon variant="subtle" color={favorites.includes(exercise.id) ? "orange" : "gray"} size={40} aria-label={`${favorites.includes(exercise.id) ? "Unsave" : "Save"} ${exercise.name}`} aria-pressed={favorites.includes(exercise.id)} onClick={() => toggleFavorite(exercise.id)}><Star size={19} fill={favorites.includes(exercise.id) ? "currentColor" : "none"} /></ActionIcon></Group>
        <Title order={2} fz="xl">{exercise.name}</Title>
        <Text size="sm" c="dimmed">{exercise.equipmentIds.length ? exercise.equipmentIds.map((id) => getEquipmentById(id)?.name || id).join(" + ") : "No equipment needed"}</Text>
        <Text size="xs" c="dimmed" tt="capitalize">{exercise.difficulty} · {exercise.movementPattern.replaceAll("_", " ")}</Text>
        <Button variant="light" color="gray" mt="auto" aria-label={`View ${exercise.name} guide`} leftSection={<BookOpen size={16} />} onClick={() => setGuide(exercise)}>View form guide</Button>
      </Stack></Paper>)}
    </SimpleGrid>
    {!results.length && <Paper className="surface" p="xl"><Title order={2} fz="xl">No exercises match yet.</Title><Text c="dimmed" mt="sm">Try another search or clear a filter. Favorites stay private to this account on this device.</Text><Button variant="subtle" mt="md" onClick={() => { setQuery(""); setMuscle(null); setDifficulty(null); setOnlyFavorites(false); }}>Clear filters</Button></Paper>}
    <ExerciseGuideModal opened={Boolean(guide)} onClose={() => setGuide(null)} exercise={guide} />
  </Stack>;
}
