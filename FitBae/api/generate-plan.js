import {
  WorkoutPlanValidationError,
  buildWorkoutPlanPrompt,
  createWorkoutGenerationContext,
  normalizeWorkoutPlan,
} from "../src/lib/fitnessConfig.js";

export const config = {
  maxDuration: 60,
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const MODEL_TIMEOUT_MS = 47_000;
const AUTH_TIMEOUT_MS = 8_000;
const MAX_REQUEST_BYTES = 24_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 6;
const requestBuckets = new Map();

function send(res, status, payload, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  for (const [name, value] of Object.entries(extraHeaders)) {
    res.setHeader(name, value);
  }
  res.end(JSON.stringify(payload));
}

function getClientAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return String(firstForwarded || req.socket?.remoteAddress || "unknown").trim().slice(0, 100);
}

function checkRateLimit(key) {
  const now = Date.now();
  const existing = requestBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (requestBuckets.size > 500) {
    for (const [bucketKey, value] of requestBuckets) {
      if (value.resetAt <= now) requestBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= RATE_LIMIT_REQUESTS,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function parseBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString());
  }
  return {};
}

function abortableFetch(url, options, milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function verifySupabaseUser(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error("Server authentication is not configured.");
    error.code = "SERVER_AUTH_NOT_CONFIGURED";
    throw error;
  }

  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ") || authorization.length < 20) {
    const error = new Error("Sign in again before generating a workout plan.");
    error.code = "UNAUTHENTICATED";
    throw error;
  }

  const response = await abortableFetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization,
      },
    },
    AUTH_TIMEOUT_MS,
  );

  if (!response.ok) {
    const error = new Error("Your session expired. Sign in again and retry.");
    error.code = "UNAUTHENTICATED";
    throw error;
  }

  const user = await response.json().catch(() => null);
  if (!user?.id) {
    const error = new Error("Your session could not be verified.");
    error.code = "UNAUTHENTICATED";
    throw error;
  }
  return user;
}

function parseModelJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    const error = new Error("Gemini returned an empty response.");
    error.code = "EMPTY_MODEL_RESPONSE";
    throw error;
  }
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^\uFEFF/, "");
  try {
    return JSON.parse(cleaned);
  } catch (cause) {
    const error = new Error("Gemini returned invalid JSON.", { cause });
    error.code = "INVALID_MODEL_JSON";
    throw error;
  }
}

function safeModelName() {
  const configured = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  return /^[a-zA-Z0-9._-]+$/.test(configured) ? configured : DEFAULT_MODEL;
}

async function generateWithGemini(context, apiKey) {
  const model = safeModelName();
  const response = await abortableFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
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
          ...(model === DEFAULT_MODEL
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      }),
    },
    MODEL_TIMEOUT_MS,
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error("Gemini rejected the generation request.");
    error.code = response.status === 429 ? "MODEL_RATE_LIMITED" : "MODEL_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseModelJson(text);
}

export default async function handler(req, res) {
  // Capacitor serves bundled assets at this origin. Bearer auth remains required;
  // no wildcard origins or cookies are enabled for cross-origin callers.
  res.setHeader("Vary", "Origin");
  if (req.headers.origin === "https://localhost") {
    res.setHeader("Access-Control-Allow-Origin", "https://localhost");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    return send(
      res,
      405,
      { code: "METHOD_NOT_ALLOWED", message: "Use POST to generate a workout plan." },
      { Allow: "POST, OPTIONS" },
    );
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return send(res, 413, {
      code: "REQUEST_TOO_LARGE",
      message: "The workout profile is too large to process.",
    });
  }

  const rateLimit = checkRateLimit(getClientAddress(req));
  if (!rateLimit.allowed) {
    return send(
      res,
      429,
      {
        code: "GENERATION_RATE_LIMITED",
        message: "Too many plans were requested. Please wait a few minutes and try again.",
      },
      { "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return send(res, 503, {
      code: "GENERATION_NOT_CONFIGURED",
      message: "Workout generation is not configured on the server.",
    });
  }

  try {
    await verifySupabaseUser(req);
  } catch (error) {
    if (error?.name === "AbortError") {
      return send(res, 503, {
        code: "AUTH_UNAVAILABLE",
        message: "Sign-in verification is temporarily unavailable. Please retry.",
      });
    }
    const status = error?.code === "UNAUTHENTICATED" ? 401 : 503;
    return send(res, status, {
      code: error?.code || "AUTH_UNAVAILABLE",
      message: error?.message || "The signed-in user could not be verified.",
    });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return send(res, 400, {
      code: "INVALID_JSON",
      message: "The generation request contains invalid JSON.",
    });
  }
  if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_REQUEST_BYTES) {
    return send(res, 413, {
      code: "REQUEST_TOO_LARGE",
      message: "The workout profile is too large to process.",
    });
  }

  let context;
  try {
    context = createWorkoutGenerationContext(body?.profile);
  } catch (error) {
    if (error instanceof WorkoutPlanValidationError) {
      return send(res, 400, { code: error.code, message: error.message });
    }
    return send(res, 400, {
      code: "INVALID_PROFILE",
      message: "The workout profile is incomplete or invalid.",
    });
  }

  try {
    const rawPlan = await generateWithGemini(context, apiKey);
    const plan = normalizeWorkoutPlan(rawPlan, context);
    return send(res, 200, { plan });
  } catch (error) {
    if (error?.name === "AbortError") {
      return send(res, 504, {
        code: "GENERATION_TIMEOUT",
        message: "Workout generation took too long. Please try again.",
      });
    }
    if (error?.code === "MODEL_RATE_LIMITED") {
      return send(
        res,
        429,
        {
          code: "GENERATION_RATE_LIMITED",
          message: "Workout generation is busy or has reached its quota. Please wait and retry.",
        },
        { "Retry-After": "60" },
      );
    }
    if (error instanceof WorkoutPlanValidationError) {
      console.error("Generated workout rejected:", error.message, error.issues);
      return send(res, 502, {
        code: error.code,
        message: "The generated plan did not pass safety checks. Please generate it again.",
      });
    }
    console.error("Workout generation failed:", error?.code || error?.name || "unknown");
    return send(res, 502, {
      code: error?.code || "GENERATION_FAILED",
      message: "The workout service could not create a valid plan. Please try again.",
    });
  }
}
