import axios from "axios";
import { config, log } from "./config.js";

// =============================================================================
// Firecrawl — primary realtor-intel scraper.
// Sources we try in priority order: ListReports, Realtor.com, Homes.com, Zillow,
// HomeBot (login-walled), RETR (paid). Each enrichment is best-effort: if a
// source 404s or rate-limits, we move on and merge what we got.
// =============================================================================

async function firecrawlExtract(url, schema, prompt) {
  if (!config.enrich.firecrawl) {
    log.warn({ url }, "Firecrawl key missing — skipping");
    return null;
  }
  try {
    const res = await axios.post(
      "https://api.firecrawl.dev/v1/scrape",
      {
        url,
        formats: ["extract"],
        extract: { schema, prompt },
      },
      { headers: { Authorization: `Bearer ${config.enrich.firecrawl}` }, timeout: 25000 }
    );
    return res.data?.data?.extract || null;
  } catch (e) {
    log.debug({ url, err: e.response?.status || e.message }, "firecrawl miss");
    return null;
  }
}

async function firecrawlSearch(query) {
  if (!config.enrich.firecrawl) return null;
  try {
    const res = await axios.post(
      "https://api.firecrawl.dev/v1/search",
      { query, limit: 5 },
      { headers: { Authorization: `Bearer ${config.enrich.firecrawl}` }, timeout: 20000 }
    );
    return res.data?.data || [];
  } catch (e) {
    log.debug({ query, err: e.message }, "firecrawl search miss");
    return null;
  }
}

const realtorVolumeSchema = {
  type: "object",
  properties: {
    agent_name: { type: "string" },
    transactions_12mo: { type: "number", description: "Number of closed transactions in last 12 months" },
    listings_active: { type: "number" },
    listings_sold_12mo: { type: "number" },
    avg_price: { type: "number" },
    total_volume_12mo: { type: "number", description: "Total $ closed last 12 months" },
    cities_served: { type: "array", items: { type: "string" } },
    brokerage: { type: "string" },
    profile_url: { type: "string" },
  },
};

const realtorPrompt =
  "Extract the agent's name, brokerage, and their production for the LAST 12 MONTHS: number of closed transactions, active listings, sold listings, average sale price, and total dollar volume. If only YTD or all-time numbers are shown, return null for the 12-month fields.";

/**
 * Enrich a realtor with public production data. Tries multiple sources and
 * merges the best result. Returns { source, volume_12mo, deals_12mo, ... }.
 */
export async function enrichRealtorPublicProduction({ name, city, state, brokerage }) {
  const q = `${name} ${brokerage || ""} ${city || ""} ${state || ""} realtor`.trim();

  // 1. Search for the agent profile page across the platforms
  const results = (await firecrawlSearch(q)) || [];
  const candidates = results
    .filter(r => /realtor\.com|homes\.com|zillow\.com|listreports\.com|homebot|retrcompany|retr\./i.test(r.url || ""))
    .slice(0, 4);

  let best = null;
  for (const cand of candidates) {
    const data = await firecrawlExtract(cand.url, realtorVolumeSchema, realtorPrompt);
    if (!data) continue;
    const score = (data.transactions_12mo ? 2 : 0) + (data.total_volume_12mo ? 2 : 0) + (data.brokerage ? 1 : 0);
    if (!best || score > best._score) best = { ...data, _source: cand.url, _score: score };
  }

  if (!best) return { source: null, deals_12mo: null, volume_12mo: null };
  return {
    source: best._source,
    deals_12mo: best.transactions_12mo ?? best.listings_sold_12mo ?? null,
    volume_12mo: best.total_volume_12mo ?? null,
    listings_active: best.listings_active ?? null,
    brokerage: best.brokerage ?? brokerage ?? null,
  };
}

// =============================================================================
// Twilio Lookup — phone validation (mobile vs landline, active)
// =============================================================================
export async function verifyPhone(phone) {
  if (!phone) return { valid: false, type: null };
  if (!config.enrich.twilio.sid) return { valid: true, type: "unknown", skipped: true };
  const e164 = normalizePhone(phone);
  try {
    const res = await axios.get(
      `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`,
      { auth: { username: config.enrich.twilio.sid, password: config.enrich.twilio.token }, timeout: 10000 }
    );
    return {
      valid: res.data.valid !== false,
      type: res.data.line_type_intelligence?.type || null,
      carrier: res.data.line_type_intelligence?.carrier_name || null,
      e164: res.data.phone_number,
    };
  } catch (e) {
    log.debug({ phone, status: e.response?.status }, "twilio lookup miss");
    return { valid: false, type: null, error: e.response?.status };
  }
}

// =============================================================================
// NeverBounce — email validation
// =============================================================================
export async function verifyEmail(email) {
  if (!email) return { valid: false };
  if (!config.enrich.neverbounce) return { valid: true, skipped: true };
  try {
    const res = await axios.get("https://api.neverbounce.com/v4/single/check", {
      params: { key: config.enrich.neverbounce, email },
      timeout: 10000,
    });
    return {
      valid: res.data.result === "valid" || res.data.result === "catchall",
      result: res.data.result,
    };
  } catch (e) {
    log.debug({ email, err: e.message }, "neverbounce miss");
    return { valid: false };
  }
}

// =============================================================================
// Smarty — address validation + USPS standardization
// =============================================================================
export async function verifyAddress({ street, city, state, zip }) {
  if (!street) return { valid: false };
  if (!config.enrich.smarty.id) return { valid: true, skipped: true };
  try {
    const res = await axios.get("https://us-street.api.smartystreets.com/street-address", {
      params: {
        "auth-id": config.enrich.smarty.id,
        "auth-token": config.enrich.smarty.token,
        street, city, state, zipcode: zip,
        match: "enhanced",
      },
      timeout: 10000,
    });
    const r = res.data?.[0];
    if (!r) return { valid: false };
    return {
      valid: true,
      e: r.components,
      street: `${r.delivery_line_1}`,
      city: r.components.city_name,
      state: r.components.state_abbreviation,
      zip: `${r.components.zipcode}-${r.components.plus4_code || ""}`.replace(/-$/, ""),
      vacant: r.analysis?.vacant === "Y",
      no_stat: r.analysis?.no_stat === "Y",
      footnotes: r.analysis?.footnotes,
    };
  } catch (e) {
    log.debug({ err: e.message }, "smarty miss");
    return { valid: false };
  }
}

function normalizePhone(p) {
  const d = (p || "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return p;
}
