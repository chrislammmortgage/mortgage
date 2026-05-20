// Transcript summarizer. Uses the Anthropic API when ANTHROPIC_API_KEY is
// configured; falls back to the rule-based scanner that already lives in
// webhooks/disposition.js. The Anthropic upgrade gives much better follow-up
// task extraction from messy transcripts.

import axios from "axios";
import { log } from "./config.js";

const SYSTEM = `You are an executive assistant for a mortgage branch manager.
Given a call transcript, extract:
  1. A one-sentence "what happened" summary (max 240 chars).
  2. Concrete follow-up actions, each with { subject, description, due_in_days }.
     Capture commitments only — "send the rate scenario", "schedule a tour",
     "intro me to the listing agent", "refi consult next week".
Output strict JSON: { "snippet": string, "followups": [{ subject, description, due_in_days }] }.`;

export async function summarizeTranscript(transcript) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !transcript) return null;
  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: "user", content: transcript.slice(0, 8000) }],
      },
      {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 15000,
      }
    );
    const text = res.data.content?.[0]?.text || "";
    const json = JSON.parse(text.replace(/^```json\n?|\n?```$/g, ""));
    return {
      snippet: json.snippet,
      followups: (json.followups || []).map(f => ({
        subject: f.subject, description: f.description,
        dueDate: dayPlus(f.due_in_days || 2),
      })),
    };
  } catch (e) {
    log.warn({ err: e.message }, "anthropic summarize failed — falling back to rules");
    return null;
  }
}

function dayPlus(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
