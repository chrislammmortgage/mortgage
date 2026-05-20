import "dotenv/config";
import pino from "pino";

export const config = {
  env: process.env.NODE_ENV || "development",
  tz: process.env.TZ || "America/Los_Angeles",
  port: parseInt(process.env.PORT || "3001", 10),
  dryRun: process.env.DRY_RUN === "true",
  routeToOwnerOnly: process.env.ROUTE_TO_OWNER_ONLY !== "false",
  owner: {
    email: process.env.OWNER_EMAIL,
    name: process.env.OWNER_NAME || "Chris Lamm",
  },
  assignees: (process.env.ASSIGNEE_EMAILS || "")
    .split(",").map(s => s.trim()).filter(Boolean),
  sf: {
    loginUrl: process.env.SF_LOGIN_URL || "https://login.salesforce.com",
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    refreshToken: process.env.SF_REFRESH_TOKEN,
    instanceUrl: process.env.SF_INSTANCE_URL,
    fields: {
      lastTouch: process.env.SF_FIELD_LAST_TOUCH || "Last_Touch__c",
      themeDayTouch: process.env.SF_FIELD_THEMEDAY_TOUCH || "Last_Theme_Day_Touch__c",
      activeRealtor: process.env.SF_FIELD_ACTIVE_REALTOR || "Active_Realtor__c",
      loAssigned: process.env.SF_FIELD_LO_ASSIGNED || "Loan_Officer__c",
      pasAssigned: process.env.SF_FIELD_PAS_ASSIGNED || "PAS_Assigned__c",
      realtorVolume12mo: process.env.SF_FIELD_REALTOR_VOLUME_12MO || "Realtor_Volume_12mo__c",
      captureRate: process.env.SF_FIELD_CAPTURE_RATE || "Capture_Rate__c",
      rotationPool: process.env.SF_FIELD_ROTATION_POOL || "Rotation_Pool__c",
    },
  },
  pb: {
    clientId: process.env.PHONEBURNER_CLIENT_ID,
    clientSecret: process.env.PHONEBURNER_CLIENT_SECRET,
    refreshToken: process.env.PHONEBURNER_REFRESH_TOKEN,
    memberId: process.env.PHONEBURNER_MEMBER_ID,
    baseUrl: process.env.PHONEBURNER_BASE_URL || "https://www.phoneburner.com/rest/1/",
    folders: {
      mon: process.env.PB_FOLDER_MONDAY,
      tue: process.env.PB_FOLDER_TUESDAY,
      wed: process.env.PB_FOLDER_WEDNESDAY,
      thu: process.env.PB_FOLDER_THURSDAY,
      fri: process.env.PB_FOLDER_FRIDAY,
    },
    webhookUrl: process.env.PB_WEBHOOK_URL,
  },
  ms: {
    tenantId: process.env.MS_TENANT_ID,
    clientId: process.env.MS_CLIENT_ID,
    clientSecret: process.env.MS_CLIENT_SECRET,
    fromAddress: process.env.MS_FROM_ADDRESS,
  },
  enrich: {
    firecrawl: process.env.FIRECRAWL_API_KEY,
    twilio: {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
    },
    neverbounce: process.env.NEVERBOUNCE_API_KEY,
    smarty: {
      id: process.env.SMARTY_AUTH_ID,
      token: process.env.SMARTY_AUTH_TOKEN,
    },
  },
  approvalSecret: process.env.APPROVAL_SECRET || "dev-only-secret",
};

let prettyAvailable = false;
try { await import("pino-pretty"); prettyAvailable = true; } catch {}
export const log = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: (config.env === "development" && prettyAvailable)
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export function requireKeys(keys, label) {
  const missing = keys.filter(k => {
    const v = k.split(".").reduce((o, p) => o?.[p], config);
    return !v;
  });
  if (missing.length) {
    log.warn({ missing, label }, "config keys missing — running degraded");
  }
  return missing.length === 0;
}
