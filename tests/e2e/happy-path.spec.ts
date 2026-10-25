import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("demo creator builds, witnesses, publishes and verifies a record", async ({
  page,
  browser,
  baseURL,
}) => {
  const run = Date.now().toString(36);
  const title = `E2E studio morning ${run}`;
  const witnessOneName = "Morgan Field";
  const witnessTwoName = "Ren Ito";
  const witnessOneEmail = `morgan.${run}@example.com`;
  const witnessTwoEmail = `ren.${run}@example.com`;
  const latitude = "51.45453";
  const longitude = "-2.58791";

  await page.goto("/login");
  await page.getByRole("button", { name: "Fill credentials" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/new");
  await page.locator("#title").fill(title);
  await page
    .locator("#summary")
    .fill(
      "A working record for a printmaking session, created to exercise the complete evidence and witness flow in the demo application.",
    );
  await page.locator("#category").selectOption("craft");
  await page.locator("#locationName").fill("Bristol, United Kingdom");
  await page.locator("#startAt").fill("2026-09-15T09:00");
  await page.locator("#endAt").fill("2026-09-15T13:00");
  await page.locator("#latitude").fill(latitude);
  await page.locator("#longitude").fill(longitude);

  const claimFields = page.locator('textarea[placeholder^="A specific thing"]');
  await claimFields
    .nth(0)
    .fill("I printed and editioned six woodblock prints at the studio on 15 September 2026.");
  await page.getByRole("button", { name: "Add another claim" }).click();
  await claimFields
    .nth(1)
    .fill("The inks were mixed by hand at the studio from pigment and linseed oil.");

  await page
    .locator('input[type="file"]')
    .setInputFiles("tests/fixtures/print-studio.png");
  await expect(page.getByLabel("Cover image")).toBeChecked();

  await page.getByRole("button", { name: /Create draft record/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/experiences\/[^/]+$/, {
    timeout: 30_000,
  });
  const experienceId = page.url().split("/").pop();
  expect(experienceId).toBeTruthy();

  // Record self-declared device context, so the final record can reach fully verified.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Record device context" }).click();
  await expect(page.getByText("Device context recorded")).toBeVisible({
    timeout: 20_000,
  });

  // Invite the first witness to the first claim.
  await page.locator("#witness-claim").selectOption({ index: 0 });
  await page.locator("#witness-name-invite").fill(witnessOneName);
  await page.locator("#witness-email-invite").fill(witnessOneEmail);
  await page.getByRole("button", { name: "Invite witness" }).click();
  const inviteField = page.locator('input[aria-label="Witness attestation link"]');
  await expect(inviteField).toBeVisible();
  const firstInvite = await inviteField.inputValue();
  expect(firstInvite).toContain("/attest/");

  // Invite the second witness to the second claim.
  await page.locator("#witness-claim").selectOption({ index: 1 });
  await page.locator("#witness-name-invite").fill(witnessTwoName);
  await page.locator("#witness-email-invite").fill(witnessTwoEmail);
  await page.getByRole("button", { name: "Invite witness" }).click();
  await expect.poll(async () => inviteField.inputValue()).not.toBe(firstInvite);
  const secondInvite = await inviteField.inputValue();
  expect(secondInvite).toContain("/attest/");
  expect(secondInvite).not.toBe(firstInvite);

  async function attest(name: string, relationship: string, link: string) {
    const witnessContext = await browser.newContext({ baseURL });
    const witnessPage = await witnessContext.newPage();
    await witnessPage.goto(link);
    await expect(
      witnessPage.getByRole("heading", {
        name: "Someone has asked you to witness a claim.",
      }),
    ).toBeVisible();
    await witnessPage.locator("#witness-relationship").fill(relationship);
    await witnessPage
      .getByRole("checkbox", { name: /I confirm that I am/ })
      .check();
    await witnessPage
      .getByRole("checkbox", { name: /I confirm that the relationship/ })
      .check();
    await witnessPage
      .getByRole("button", { name: /Sign witness attestation/ })
      .click();
    await expect(
      witnessPage.getByRole("heading", {
        name: "Your attestation is recorded.",
      }),
    ).toBeVisible({ timeout: 30_000 });
    await witnessContext.close();
    void name;
  }

  await attest(
    witnessOneName,
    "Collector who commissioned the edition",
    firstInvite,
  );
  await attest(
    witnessTwoName,
    "Fellow printmaker present in the studio",
    secondInvite,
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(600);

  const apiResponse = await page.request.get(`/api/experiences/${experienceId}`);
  expect(apiResponse.ok()).toBe(true);
  const apiPayload = (await apiResponse.json()) as {
    data: { slug: string; trustLevel: string; status: string };
  };
  expect(apiPayload.data.status).toBe("published");
  expect(apiPayload.data.trustLevel).toBe("fully_verified");

  await page.goto(`/verify/${apiPayload.data.slug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".status-banner")).toContainText(
    "Record integrity verified",
  );
  await expect(page.getByText("Fully verified").first()).toBeVisible();
  await expect(
    page.getByRole("img", { name: /QR code linking to the public verification page/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "What happened, in order" })).toBeVisible();
  await expect(page.getByText("Record published")).toBeVisible();
  await expect(page.getByText("2 independent witnesses attested")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What is being asserted" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download JSON" }).first(),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON" }).first().click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const verificationJson = JSON.parse(
    await readFile(downloadPath as string, "utf8"),
  ) as {
    integrity: { altered: boolean; recordHash: string };
    trust: { level: string; witnessCount: number };
    claims: unknown[];
    privacy: { exactCoordinatesIncluded: boolean; witnessEmailsIncluded: boolean };
  };

  expect(verificationJson.integrity.altered).toBe(false);
  expect(verificationJson.integrity.recordHash).toHaveLength(64);
  expect(verificationJson.trust.level).toBe("fully_verified");
  expect(verificationJson.trust.witnessCount).toBe(2);
  expect(verificationJson.claims).toHaveLength(2);
  expect(verificationJson.privacy.exactCoordinatesIncluded).toBe(false);
  expect(verificationJson.privacy.witnessEmailsIncluded).toBe(false);

  const jsonText = JSON.stringify(verificationJson);
  expect(jsonText).not.toContain(witnessOneEmail);
  expect(jsonText).not.toContain(witnessTwoEmail);
  expect(jsonText).not.toContain(witnessOneName);
  expect(jsonText).not.toContain(witnessTwoName);
  expect(jsonText).not.toContain(latitude);
  expect(jsonText).not.toContain(longitude);

  // Clean up the test record through the same creator interface.
  await page.goto(`/dashboard/experiences/${experienceId}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
