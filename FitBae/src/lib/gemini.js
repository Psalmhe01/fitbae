import { supabase } from "./supabase.js";
import { Capacitor } from "@capacitor/core";
import { generationEndpoint } from "./mobileConfig.js";
import {
  WorkoutPlanValidationError,
  buildWorkoutPlanPrompt,
  createWorkoutGenerationContext,
  normalizeWorkoutPlan,
  toSafeGenerationProfile,
} from "./fitnessConfig.js";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const SERVER_TIMEOUT_MS = 58_000;
const DIRECT_TIMEOUT_MS = 45_000;
const LEGACY_BROWSER_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_GEMINI_API_KEY
  : undefined;

let warnedAboutBrowserKey = false;

export class WorkoutGenerationError extends Error {
  constructor(message, { code = "GENERATION_FAILED", status = 0, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "WorkoutGenerationError";
    this.code = code;
    this.status = status;
  }
}

function isLocalDevelopment() {
  return import.meta.env.DEV;
}

function timeoutController(milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return { controller, clear: () => clearTimeout(timer) };
}

function readableServerMessage(payload, fallback) {
  return typeof payload?.message === "string" && payload.message.trim()
    ? payload.message.trim()
    : fallback;
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  return response.json().catch(() => null);
}

function parseModelJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new WorkoutGenerationError(
      "The workout service returned an empty plan. Please try again.",
      { code: "EMPTY_MODEL_RESPONSE" },
    );
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^\uFEFF/, "");
  try {
    return JSON.parse(cleaned);
  } catch (cause) {
    throw new WorkoutGenerationError(
      "The workout service returned an unreadable plan. Please try again.",
      { code: "INVALID_MODEL_JSON", cause },
    );
  }
}

async function getAccessToken() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function requestServerPlan(safeProfile, context) {
  const token = await getAccessToken();
  const timeout = timeoutController(SERVER_TIMEOUT_MS);

  try {
    const response = await fetch(generationEndpoint(Capacitor.isNativePlatform(), import.meta.env.VITE_API_BASE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ profile: safeProfile }),
      signal: timeout.controller.signal,
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const code =
        payload?.code ||
        ([404, 405, 501].includes(response.status)
          ? "GENERATION_ENDPOINT_UNAVAILABLE"
          : "GENERATION_FAILED");
      throw new WorkoutGenerationError(
        readableServerMessage(payload, `Workout generation failed (${response.status}).`),
        { code, status: response.status },
      );
    }

    if (!payload) {
      throw new WorkoutGenerationError(
        "The generation API is not available in this local development server.",
        { code: "GENERATION_ENDPOINT_UNAVAILABLE", status: response.status },
      );
    }

    return normalizeWorkoutPlan(payload.plan ?? payload, context);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new WorkoutGenerationError(
        "Workout generation took too long. Please check your connection and try again.",
        { code: "GENERATION_TIMEOUT", cause: error },
      );
    }
    if (error instanceof WorkoutGenerationError || error instanceof WorkoutPlanValidationError) {
      throw error;
    }
    throw new WorkoutGenerationError(
      "The workout generation service could not be reached.",
      { code: "GENERATION_ENDPOINT_UNAVAILABLE", cause: error },
    );
  } finally {
    timeout.clear();
  }
}

async function requestGeminiDirectly(context, apiKey) {
  const timeout = timeoutController(DIRECT_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildWorkoutPlanPrompt(context) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          candidateCount: 1,
          temperature: 0.35,
          maxOutputTokens: 16_384,
        },
      }),
      signal: timeout.controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const statusMessage =
        response.status === 429
          ? "Workout generation is busy or has reached its quota. Please wait and try again."
          : response.status === 401 || response.status === 403
            ? "The local workout generator key was rejected. Check your development configuration."
            : "The workout service could not create a plan. Please try again.";
      throw new WorkoutGenerationError(statusMessage, {
        code: response.status === 429 ? "GENERATION_RATE_LIMITED" : "MODEL_REQUEST_FAILED",
        status: response.status,
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return normalizeWorkoutPlan(parseModelJson(text), context);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new WorkoutGenerationError(
        "Workout generation took too long. Please try again.",
        { code: "GENERATION_TIMEOUT", cause: error },
      );
    }
    if (error instanceof WorkoutGenerationError || error instanceof WorkoutPlanValidationError) {
      throw error;
    }
    throw new WorkoutGenerationError(
      "The local workout service could not be reached.",
      { code: "MODEL_UNAVAILABLE", cause: error },
    );
  } finally {
    timeout.clear();
  }
}

/**
 * Generates and validates a workout plan while preserving the original public
 * API used by onboarding and dashboard pages.
 */
export async function generateWorkoutPlan(profile) {
  const context = createWorkoutGenerationContext(profile);
  const safeProfile = toSafeGenerationProfile(profile);

  try {
    return await requestServerPlan(safeProfile, context);
  } catch (error) {
    const canUseLocalFallback =
      ["GENERATION_ENDPOINT_UNAVAILABLE", "GENERATION_NOT_CONFIGURED"].includes(
        error?.code,
      ) &&
      Boolean(LEGACY_BROWSER_KEY) &&
      isLocalDevelopment();

    if (!canUseLocalFallback) throw error;

    if (!warnedAboutBrowserKey) {
      warnedAboutBrowserKey = true;
      console.warn(
        "[FitBae] Using the development-only VITE_GEMINI_API_KEY fallback. " +
          "VITE_ variables are embedded in browser JavaScript; never use this fallback in production.",
      );
    }

    return requestGeminiDirectly(context, LEGACY_BROWSER_KEY);
  }
}
