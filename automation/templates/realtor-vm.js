// VM follow-up templates for Monday Power Hour (realtors).
// Value-based: lead with what *they* care about — their pipeline, market, capture rate.

export function realtorVmSms({ realtor, stats }) {
  const first = realtor.FirstName || realtor.Name?.split(" ")[0] || "there";
  const liveCount = (stats.leads || 0) + (stats.preapprovals || 0) + (stats.deals || 0);
  const live = liveCount > 0
    ? `we've got ${liveCount} in motion together right now`
    : "no live files between us right now — let's change that";
  return `Hi ${first}, Chris Lamm — tried you. Quick check-in, ${live}. Got 5 min this week?`;
}

export function realtorVmEmail({ realtor, stats, market }) {
  const first = realtor.FirstName || realtor.Name?.split(" ")[0] || "there";
  const liveLine = (stats.leads || stats.preapprovals || stats.deals)
    ? `<p>Quick snapshot of what we have live together:</p>
       <ul>
         <li><strong>${stats.leads || 0}</strong> leads in progress</li>
         <li><strong>${stats.preapprovals || 0}</strong> pre-approvals working</li>
         <li><strong>${stats.deals || 0}</strong> deals in contract</li>
       </ul>`
    : `<p>I don't see anything live between us right now — let's fix that.</p>`;
  const marketLine = market?.summary
    ? `<p><em>Market note:</em> ${market.summary}</p>`
    : "";
  return {
    subject: `${first} — quick check-in from Chris`,
    html: `
      <p>Hey ${first},</p>
      <p>Tried you today — sorry I missed you. Wanted to check in.</p>
      ${liveLine}
      ${marketLine}
      <p>Got 5 minutes this week to talk about your next buyer? Reply with a window and I'll grab it.</p>
      <p>— Chris<br/>Chris Lamm | Branch Manager | MortgageOne | NMLS# 209221</p>
    `,
  };
}
