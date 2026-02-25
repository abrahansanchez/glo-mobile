function toArray(value) {
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

function normalizeFromMessages(transcript) {
  const messages = toArray(transcript?.messages);
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

export function normalizeTranscriptTimeline(transcript) {
  const fromMessages = normalizeFromMessages(transcript);
  if (fromMessages.length > 0) {
    return {
      mode: "messages",
      timeline: fromMessages,
    };
  }

  return {
    mode: "legacy",
    timeline: normalizeFromLegacy(transcript),
  };
}

export function transcriptCallSid(transcript) {
  return transcript?.callSid || transcript?.call_sid || null;
}

