import express from "express";
import { config, log } from "./config.js";
import { handleDisposition } from "./webhooks/disposition.js";
import { sendOrDraft } from "./email.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, dryRun: config.dryRun }));

// PhoneBurner disposition webhook
app.post("/webhooks/phoneburner", async (req, res) => {
  try {
    const result = await handleDisposition(req.body, {});
    res.json(result);
  } catch (e) {
    log.error({ err: e.message }, "webhook error");
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Easy-button manual dispatch — for the dashboard's "Send SMS" / "Send Email" buttons
app.post("/easy-button/send-email", async (req, res) => {
  const { to, subject, html, draft = true } = req.body;
  const result = await sendOrDraft({ to, subject, html, draft });
  res.json(result);
});

app.listen(config.port, () => {
  log.info({ port: config.port, dryRun: config.dryRun }, "automation server listening");
});
