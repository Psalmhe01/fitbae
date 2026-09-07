import { Group, Text } from "@mantine/core";

export function BrandMark({ compact = false, light = false }) {
  return (
    <Group gap={10} wrap="nowrap" aria-label="FitBae">
      <svg
        className="brand-mark"
        width="34"
        height="34"
        viewBox="0 0 34 34"
        aria-hidden="true"
      >
        <rect width="34" height="34" rx="10" fill="currentColor" />
        <circle cx="12" cy="17" r="5.25" fill="none" stroke="var(--brand-ink)" strokeWidth="3" />
        <circle cx="22" cy="17" r="5.25" fill="none" stroke="var(--brand-coral)" strokeWidth="3" />
        <path d="M15.7 17h2.6" stroke="var(--brand-ink)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {!compact && (
        <Text
          component="span"
          className="brand-wordmark"
          c={light ? "white" : undefined}
        >
          FIT<span>BAE</span>
        </Text>
      )}
    </Group>
  );
}
