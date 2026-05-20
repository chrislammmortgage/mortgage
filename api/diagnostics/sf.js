import { sfConn, soql } from "../../automation/salesforce.js";

export default async function handler(req, res) {
  try {
    const conn = await sfConn();
    const me = await conn.identity();
    const sample = await soql("SELECT Id, Name FROM Contact LIMIT 3");
    res.status(200).json({
      ok: true,
      instance: conn.instanceUrl,
      user: { name: me.display_name, email: me.email, organization_id: me.organization_id },
      sample_contacts: sample.length,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, hint: "Run /api/oauth/salesforce/start first" });
  }
}
