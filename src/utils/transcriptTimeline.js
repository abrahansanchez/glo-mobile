function toArray(value) {
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }
  return Array.isArray(value) ? value : [];
}

function toText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value == null) return "";
  if (typeof value === "object") {
    const maybeText = value.text ?? value.content ?? value.message ?? value.body;
    if (typeof maybeText === "string") return maybeText.trim();
    return "";
  }
  return "";
}

function normalizeRole(role, fallback = "system") {
  const raw = typeof role === "string" ? role.toLowerCase() : "";
  if (raw === "assistant" || raw === "ai") return "assistant";
  if (raw === "caller" || raw === "user" || raw === "customer" || raw === "human") return "caller";
  if (raw === "system") return "system";
  return fallback;
}

function normalizeMessageEntry(entry, index, fallbackRole = "system") {
  if (typeof entry === "string") {
    const text = toText(entry);
    if (!text) return null;
    return { id: `line-${index}`, role: fallbackRole, text };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const text = toText(entry);
  if (!text) return null;

  return {
    id: String(entry.id || entry._id || `line-${index}`),
    role: normalizeRole(entry.role || entry.speaker, fallbackRole),
    text,
  };
}

function valueAtPath(source, path) {
  if (!source || typeof source !== "object") return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function findCandidateMessageArray(transcript) {
  const candidatePaths = [
    "messages",
    "transcript",
    "lines",
    "conversation",
    "dialogue",
    "utterances",
    "segments",
    "turns",
    "entries",
    "data.messages",
    "data.transcript",
    "data.lines",
    "payload.messages",
    "payload.transcript",
    "call.messages",
    "call.transcript",
  ];

  for (const path of candidatePaths) {
    const arr = toArray(valueAtPath(transcript, path));
    if (arr.length > 0) return arr;
  }

  return [];
}

function normalizeFromMessages(transcript) {
  const messages = findCandidateMessageArray(transcript);
  return messages
    .map((entry, index) => normalizeMessageEntry(entry, index, "system"))
    .filter(Boolean);
}

function normalizeFromLegacy(transcript) {
  const legacyTranscript = toArray(transcript?.transcript || transcript?.lines);
  const legacyAiResponses = toArray(transcript?.aiResponses);

  const maxLength = Math.max(legacyTranscript.length, legacyAiResponses.length);
  const timeline = [];

  if (maxLength > 0) {
    for (let index = 0; index < maxLength; index += 1) {
      const callerEntry = normalizeMessageEntry(legacyTranscript[index], index * 2, "caller");
      if (callerEntry) timeline.push(callerEntry);

      const aiEntry = normalizeMessageEntry(legacyAiResponses[index], index * 2 + 1, "assistant");
      if (aiEntry) timeline.push(aiEntry);
    }
    return timeline;
  }

  // Last compatibility path: some payloads encode transcript as role/text objects in a single array.
  return legacyTranscript
    .map((entry, index) => normalizeMessageEntry(entry, index, "system"))
    .filter(Boolean);
}

function normalizeFromTranscriptText(transcript) {
  const candidates = [
    transcript?.transcriptText,
    transcript?.transcript_text,
    transcript?.fullTranscript,
    transcript?.full_transcript,
    transcript?.rawTranscript,
    transcript?.raw_transcript,
    transcript?.transcript,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const text = candidate.trim();
    if (!text) continue;

    return text
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/^(assistant|ai|caller|user|customer|human|system)\s*:\s*(.+)$/i);
        if (match) {
          return {
            id: `line-${index}`,
            role: normalizeRole(match[1], "system"),
            text: String(match[2] || "").trim(),
          };
        }
        return { id: `line-${index}`, role: "system", text: line };
      });
  }

  return [];
}

function extractPreviewText(transcript) {
  const directCandidates = [
    transcript?.preview,
    transcript?.transcriptPreview,
    transcript?.transcript_preview,
    transcript?.snippet,
    transcript?.summary,
    transcript?.shortSummary,
    transcript?.callSummary,
    transcript?.analysis?.summary,
    transcript?.meta?.preview,
  ];

  for (const value of directCandidates) {
    const text = toText(value);
    if (text) return text;
  }

  return "";
}

export function normalizeTranscriptTimeline(transcript) {
  const fromMessages = normalizeFromMessages(transcript);
  if (fromMessages.length > 0) {
    return {
      mode: "messages",
      timeline: fromMessages,
    };
  }

  const fromLegacy = normalizeFromLegacy(transcript);
  if (fromLegacy.length > 0) {
    return {
      mode: "legacy",
      timeline: fromLegacy,
    };
  }

  const fromText = normalizeFromTranscriptText(transcript);
  if (fromText.length > 0) {
    return {
      mode: "text",
      timeline: fromText,
    };
  }

  const preview = extractPreviewText(transcript);
  if (preview) {
    return {
      mode: "preview",
      timeline: [{ id: "preview-0", role: "system", text: preview }],
    };
  }

  return {
    mode: "empty",
    timeline: [],
  };
}

export function transcriptCallSid(transcript) {
  return transcript?.callSid || transcript?.call_sid || null;
}

export function transcriptPreview(transcript) {
  const normalized = normalizeTranscriptTimeline(transcript);
  const first = normalized.timeline[0];
  if (!first) return "No transcript preview";
  if (normalized.mode === "preview") return first.text;
  return `${first.role || "system"}: ${first.text || ""}`;
}
