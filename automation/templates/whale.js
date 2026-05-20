// Friday Whale / VIP templates — personal, relationship-first, no agenda.

export function whaleSms({ contact }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  return `Hi ${first}, Chris — thinking of you. Around for a quick catch-up this week?`;
}

export function whaleEmail({ contact, lastContext }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  // Whale email is intentionally minimal and personal — no marketing-feel.
  // lastContext optionally injects a recent relationship note ("last time we
  // talked about your daughter's wedding") to humanize.
  const personalLine = lastContext
    ? `<p>Been a minute. ${lastContext}</p>`
    : `<p>Been a minute — wanted to check in.</p>`;
  return {
    subject: `${first} — checking in`,
    html: `
      <p>Hey ${first},</p>
      ${personalLine}
      <p>No agenda — just thinking of you. Want to grab 10 minutes this week?
         Coffee, phone, whatever's easy on your end.</p>
      <p>— Chris</p>
    `,
  };
}
