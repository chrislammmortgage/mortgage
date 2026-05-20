// Pre-Approval check-in templates (Wednesday Theme Day).

export function preApprovalSms({ contact }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  return `Hi ${first}, Chris Lamm — checking in on your home search. Anything catching your eye? Happy to refresh your numbers anytime.`;
}

export function preApprovalEmail({ contact, scenario }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  const scenarioLine = scenario
    ? `<p>You're currently approved up to <strong>$${scenario.maxPrice?.toLocaleString()}</strong> at roughly <strong>$${scenario.estPayment?.toLocaleString()}/mo</strong> P&I. Want me to run numbers on a different price or program?</p>`
    : "";
  return {
    subject: `Still here for you, ${first}`,
    html: `
      <p>Hi ${first},</p>
      <p>Just wanted to check in on your home search — seen anything you like?</p>
      ${scenarioLine}
      <p>Reply with any address or scenario and I'll get you fresh numbers same day. No pressure either way.</p>
      <p>— Chris<br/>Chris Lamm | NMLS# 209221</p>
    `,
  };
}

// The 8 AM check-list email to Zak / Jennifer / Toni
export function assigneeChecklistEmail({ assignee, rows }) {
  const first = assignee.split("@")[0].split(/[._-]/)[0];
  const firstCap = first.charAt(0).toUpperCase() + first.slice(1);

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.contactName}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.phone || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.email || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.agentName || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.agentPhone || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.lastTouch || "—"}</td>
    </tr>`).join("");

  return {
    subject: `Today's pre-approval check-ins (${rows.length}) — ${new Date().toLocaleDateString("en-US")}`,
    html: `
      <p>Morning ${firstCap},</p>
      <p>Here are your pre-approvals to touch base on today. For each one:</p>
      <ol>
        <li>Call the client — update their last-touch in Salesforce.</li>
        <li>Ping the active agent on how it's going with the buyer.</li>
      </ol>
      <p>The system checks Salesforce last-touch at 5 PM today. Any unupdated will get an auto-task on your queue.</p>
      <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px;width:100%;margin-top:12px">
        <thead style="background:#f5f5f5">
          <tr>
            <th style="padding:8px 10px;text-align:left">Client</th>
            <th style="padding:8px 10px;text-align:left">Phone</th>
            <th style="padding:8px 10px;text-align:left">Email</th>
            <th style="padding:8px 10px;text-align:left">Agent</th>
            <th style="padding:8px 10px;text-align:left">Agent Phone</th>
            <th style="padding:8px 10px;text-align:left">Last touch</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">
        Reply "done" to this email when you've cleared the list — or just hit each in Salesforce.
      </p>
    `,
  };
}
