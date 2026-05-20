export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "themeday-call-automation",
    version: "0.5",
    time: new Date().toISOString(),
    env: {
      hasSalesforce: !!(process.env.SF_CLIENT_ID && process.env.SF_REFRESH_TOKEN),
      hasPhoneBurner: !!(process.env.PHONEBURNER_ACCESS_TOKEN
        || (process.env.PHONEBURNER_CLIENT_ID && process.env.PHONEBURNER_REFRESH_TOKEN)),
      hasMsGraph: !!process.env.MS_TENANT_ID,
      hasFirecrawl: !!process.env.FIRECRAWL_API_KEY,
      routeToOwnerOnly: process.env.ROUTE_TO_OWNER_ONLY !== "false",
      dryRun: process.env.DRY_RUN === "true",
    },
  });
}
