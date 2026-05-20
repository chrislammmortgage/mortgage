// Thursday Past-Client templates — annual review + retention/referral.

export function pastClientSms({ contact, segment }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  if (segment === "annual_review") {
    return `Hi ${first}, Chris Lamm — it's been about a year since we closed your loan, time for your annual review. Quick look at rates/equity? `;
  }
  return `Hi ${first}, Chris Lamm — wanted to check in. Anything we can help with on the home front?`;
}

export function pastClientEmail({ contact, segment, equity }) {
  const first = contact.FirstName || contact.Name?.split(" ")[0] || "there";
  const equityLine = equity?.estimate
    ? `<p>Quick estimate from public records — your home is worth roughly <strong>$${equity.estimate.toLocaleString()}</strong>,
       and your remaining balance is around <strong>$${equity.balance?.toLocaleString() || "—"}</strong>.
       That puts your equity at roughly <strong>$${(equity.estimate - (equity.balance || 0)).toLocaleString()}</strong>.</p>`
    : "";
  const subject = segment === "annual_review"
    ? `Your annual mortgage review, ${first}`
    : `Checking in, ${first}`;
  return {
    subject,
    html: `
      <p>Hi ${first},</p>
      <p>${segment === "annual_review"
        ? "It's been about a year since we closed your loan — time for the annual mortgage review I promised."
        : "Wanted to check in and see how everything's going."}</p>
      ${equityLine}
      <p>Rates have moved, and so has equity in our market. Want Chris to run a quick no-pressure look?
         Refi options, HELOC, or just an updated payoff picture — your call.</p>
      <p>And the question we always ask: <strong>who do you know we could help the way we helped you?</strong>
         Even a quick intro text is gold to us.</p>
      <p>— Chris<br/>Chris Lamm | NMLS# 209221 | MortgageOne</p>
    `,
  };
}
