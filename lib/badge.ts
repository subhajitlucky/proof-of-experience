interface BadgeInput {
  trustLabel: string;
  status: string;
  altered: boolean;
  verifyUrl: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function displayUrl(value: string): string {
  try {
    const url = new URL(value);
    const compact = `${url.host}${url.pathname}`;
    return compact.length > 64 ? `${compact.slice(0, 61)}...` : compact;
  } catch {
    return value.slice(0, 64);
  }
}

export function renderBadgeSvg(input: BadgeInput): string {
  let eyebrow = "PROOF OF EXPERIENCE";
  let headline = input.trustLabel;
  let detail = "Record sealed and evidence on file";
  const accent = "#a63d2f";

  if (input.altered) {
    eyebrow = "RECORD INTEGRITY ALERT";
    headline = "Altered after signing";
    detail = `Trust level: ${input.trustLabel} · verification badge suspended`;
  } else if (input.status === "revoked") {
    eyebrow = "PUBLIC RECORD";
    headline = "Record revoked";
    detail = `Trust level: ${input.trustLabel} · prior evidence remains inspectable`;
  } else if (input.status === "flagged") {
    eyebrow = "PUBLIC RECORD";
    headline = "Flagged for review";
    detail = `Trust level: ${input.trustLabel}`;
  } else if (input.trustLabel === "Self-attested") {
    headline = "Self-attested";
    detail = "Witness evidence is still pending";
  } else {
    detail = "Witness-attested record · inspect the evidence";
  }

  const verify = `Verify at ${displayUrl(input.verifyUrl)}`;
  const safeVerify = escapeXml(verify);
  const safeHeadline = escapeXml(headline);
  const safeEyebrow = escapeXml(eyebrow);
  const safeDetail = escapeXml(detail);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200" role="img" aria-labelledby="badge-title badge-desc">
  <title id="badge-title">${safeEyebrow}: ${safeHeadline}</title>
  <desc id="badge-desc">${safeDetail}. ${safeVerify}</desc>
  <rect width="640" height="200" fill="#f8f3e8"/>
  <rect x="0.5" y="0.5" width="639" height="199" fill="none" stroke="#1f1d1a"/>
  <rect x="0" y="0" width="8" height="200" fill="${accent}"/>
  <line x1="32" y1="152.5" x2="608" y2="152.5" stroke="#c6bcab" stroke-width="1"/>
  <text x="32" y="42" fill="#6b6356" font-family="Verdana, Geneva, sans-serif" font-size="10" letter-spacing="2.8" text-transform="uppercase">${safeEyebrow}</text>
  <text x="32" y="95" fill="#1f1d1a" font-family="Georgia, 'Times New Roman', serif" font-size="38" letter-spacing="-0.6">${safeHeadline}</text>
  <text x="32" y="124" fill="#544e43" font-family="Verdana, Geneva, sans-serif" font-size="12">${safeDetail}</text>
  <circle cx="568" cy="79" r="43" fill="none" stroke="${accent}" stroke-width="1.4"/>
  <circle cx="568" cy="79" r="36" fill="none" stroke="${accent}" stroke-width="0.7"/>
  <text x="568" y="76" text-anchor="middle" fill="${accent}" font-family="Georgia, 'Times New Roman', serif" font-size="13" letter-spacing="1.4">POE</text>
  <text x="568" y="92" text-anchor="middle" fill="${accent}" font-family="Verdana, Geneva, sans-serif" font-size="7" letter-spacing="1.1">RECORD</text>
  <text x="32" y="178" fill="#6b6356" font-family="Verdana, Geneva, sans-serif" font-size="10" letter-spacing="0.5">${safeVerify}</text>
  <text x="608" y="178" text-anchor="end" fill="#6b6356" font-family="Verdana, Geneva, sans-serif" font-size="9" letter-spacing="1.2">EVIDENCE, NOT TRUTH</text>
</svg>`;
}
