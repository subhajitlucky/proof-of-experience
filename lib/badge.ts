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

  if (input.altered) {
    eyebrow = "RECORD INTEGRITY ALERT";
    headline = "Altered after signing";
    detail = `Trust level: ${input.trustLabel} · badge suspended`;
    stampTop = "SEAL";
    stampMain = "SUSPENDED";
  } else if (input.status === "revoked") {
    eyebrow = "PUBLIC REGISTRY / STATUS";
    headline = "Record revoked";
    detail = `Trust level: ${input.trustLabel} · prior evidence remains visible`;
    stampTop = "STATUS";
    stampMain = "REVOKED";
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
  <rect width="640" height="200" fill="#0a3529"/>
  <rect x="10.5" y="10.5" width="619" height="179" fill="none" stroke="#a5bcae" stroke-opacity="0.55"/>
  <rect x="17.5" y="17.5" width="605" height="165" fill="none" stroke="#a5bcae" stroke-opacity="0.18"/>
  <rect x="0" y="0" width="6" height="200" fill="#0d5a43"/>
  <text x="34" y="47" fill="#a5bcae" font-family="Verdana, Geneva, sans-serif" font-size="9" letter-spacing="2.5">${safeEyebrow}</text>
  <text x="34" y="102" fill="#f5f8f1" font-family="Georgia, 'Times New Roman', serif" font-size="38" letter-spacing="-0.8">${safeHeadline}</text>
  <text x="34" y="128" fill="#c7d7cc" font-family="Verdana, Geneva, sans-serif" font-size="10" letter-spacing="0.2">${safeDetail}</text>
  <line x1="34" y1="155.5" x2="606" y2="155.5" stroke="#a5bcae" stroke-opacity="0.32"/>
  <text x="34" y="177" fill="#a5bcae" font-family="Verdana, Geneva, sans-serif" font-size="9" letter-spacing="0.4">${safeVerify}</text>
  <text x="606" y="177" text-anchor="end" fill="#6f8d7b" font-family="Verdana, Geneva, sans-serif" font-size="8" letter-spacing="1.2">EVIDENCE, NOT TRUTH</text>
  <rect x="513.5" y="54.5" width="91" height="73" fill="none" stroke="#c7d7cc"/>
  <rect x="519" y="60" width="80" height="62" fill="none" stroke="#a5bcae" stroke-opacity="0.45"/>
  <text x="559" y="80" text-anchor="middle" fill="#a5bcae" font-family="Verdana, Geneva, sans-serif" font-size="7" letter-spacing="1.5">${safeStampTop}</text>
  <text x="559" y="101" text-anchor="middle" fill="#f5f8f1" font-family="Georgia, 'Times New Roman', serif" font-size="16">${safeStampMain}</text>
  <text x="559" y="113" text-anchor="middle" fill="#6f8d7b" font-family="Verdana, Geneva, sans-serif" font-size="6" letter-spacing="1.2">POE / ED25519</text>
</svg>`;
}
