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
    return compact.length > 62 ? `${compact.slice(0, 59)}...` : compact;
  } catch {
    return value.slice(0, 62);
  }
}

export function renderBadgeSvg(input: BadgeInput): string {
  let eyebrow = "PROOF OF EXPERIENCE / PUBLIC REGISTRY";
  let headline = input.trustLabel;
  let detail = "Witness-attested record · inspect the evidence";
  let stampTop = "RECORD";
  let stampMain = "SEALED";
  let accent = "#1b31c8";

  if (input.altered) {
    eyebrow = "RECORD INTEGRITY ALERT";
    headline = "Altered after signing";
    detail = `Trust level: ${input.trustLabel} · badge suspended`;
    stampTop = "SEAL";
    stampMain = "SUSPENDED";
    accent = "#101215";
  } else if (input.status === "revoked") {
    eyebrow = "PUBLIC REGISTRY / STATUS";
    headline = "Record revoked";
    detail = `Trust level: ${input.trustLabel} · prior evidence remains visible`;
    stampTop = "STATUS";
    stampMain = "REVOKED";
    accent = "#101215";
  } else if (input.status === "flagged") {
    eyebrow = "PUBLIC REGISTRY / STATUS";
    headline = "Flagged for review";
    detail = `Trust level: ${input.trustLabel} · integrity state shown on the record`;
    stampTop = "STATUS";
    stampMain = "REVIEW";
  } else if (input.trustLabel === "Self-attested") {
    headline = "Self-attested";
    detail = "Witness evidence is still pending";
    stampTop = "SEAL";
    stampMain = "VALID";
  }

  const verify = `Verify at ${displayUrl(input.verifyUrl)}`;
  const safeVerify = escapeXml(verify);
  const safeHeadline = escapeXml(headline);
  const safeEyebrow = escapeXml(eyebrow);
  const safeDetail = escapeXml(detail);
  const safeStampTop = escapeXml(stampTop);
  const safeStampMain = escapeXml(stampMain);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200" role="img" aria-labelledby="badge-title badge-desc">
  <title id="badge-title">${safeEyebrow}: ${safeHeadline}</title>
  <desc id="badge-desc">${safeDetail}. ${safeVerify}</desc>
  <rect width="640" height="200" fill="#f7f8f9"/>
  <rect x="0.5" y="0.5" width="639" height="199" fill="none" stroke="#101215"/>
  <rect x="0" y="0" width="7" height="200" fill="${accent}"/>
  <rect x="20.5" y="20.5" width="599" height="159" fill="none" stroke="#d5dade"/>
  <text x="38" y="48" fill="#1b31c8" font-family="Menlo, Consolas, monospace" font-size="9" letter-spacing="2.2">${safeEyebrow}</text>
  <text x="38" y="99" fill="#101215" font-family="Helvetica, Arial, sans-serif" font-size="37" font-weight="700" letter-spacing="-1.4">${safeHeadline}</text>
  <text x="38" y="124" fill="#545c65" font-family="Helvetica, Arial, sans-serif" font-size="10.5" letter-spacing="0.1">${safeDetail}</text>
  <line x1="38" y1="153.5" x2="601" y2="153.5" stroke="#d5dade"/>
  <text x="38" y="175" fill="#545c65" font-family="Menlo, Consolas, monospace" font-size="9" letter-spacing="0.2">${safeVerify}</text>
  <text x="601" y="175" text-anchor="end" fill="#8c949e" font-family="Menlo, Consolas, monospace" font-size="7" letter-spacing="1">EVIDENCE, NOT TRUTH</text>
  <rect x="501.5" y="47.5" width="103" height="80" fill="#ffffff" stroke="${accent}"/>
  <rect x="507.5" y="53.5" width="91" height="68" fill="none" stroke="#d5dade"/>
  <text x="553" y="75" text-anchor="middle" fill="${accent}" font-family="Menlo, Consolas, monospace" font-size="7" letter-spacing="1.4">${safeStampTop}</text>
  <text x="553" y="96" text-anchor="middle" fill="#101215" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700">${safeStampMain}</text>
  <text x="553" y="109" text-anchor="middle" fill="#8c949e" font-family="Menlo, Consolas, monospace" font-size="5.5" letter-spacing="1">POE / ED25519</text>
</svg>`;
}
