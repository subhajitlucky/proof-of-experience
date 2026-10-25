import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function sanitizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function cleaned(max: number, min = 1) {
  return z.preprocess(
    (value) => (typeof value === "string" ? sanitizeText(value) : value),
    z.string().min(min).max(max),
  );
}

function optionalCleaned(max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const cleanedValue = sanitizeText(value);
      return cleanedValue.length === 0 ? undefined : cleanedValue;
    },
    z.string().max(max).optional(),
  );
}

const email = z
  .string()
  .trim()
  .max(254)
  .transform((value) => value.toLowerCase())
  .pipe(z.string().email("Enter a valid email address"));

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string" || sanitizeText(value).length === 0) {
      return undefined;
    }
    return sanitizeText(value).toLowerCase();
  },
  z.string().email("Enter a valid email address").max(254).optional(),
);

const handle = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/,
    "Use 3–30 lowercase letters, numbers, or hyphens",
  );

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Password is too long");

const isoDate = z
  .string()
  .datetime({ offset: true, message: "Use a valid ISO date" })
  .transform((value) => new Date(value));

const optionalCoordinate = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z.number().finite().optional(),
);

const booleanInput = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "0" || value === "" || value === undefined) {
    return false;
  }
  return value;
}, z.boolean());

export const categorySchema = z.enum([
  "craft",
  "travel",
  "food",
  "art",
  "event",
  "other",
]);

export const visibilitySchema = z.enum(["private", "unlisted", "public"]);

export const claimInputSchema = z
  .object({
    text: cleaned(500, 5),
    evidence: optionalCleaned(1000),
  })
  .strict();

export const participantInputSchema = z
  .object({
    name: cleaned(120, 1),
    role: cleaned(120, 1),
    email: optionalEmail,
  })
  .strict();

const locationRefinement = {
  latitude: optionalCoordinate,
  longitude: optionalCoordinate,
};

function applyCoordinateRefinement(
  value: { latitude?: number; longitude?: number },
  ctx: z.RefinementCtx,
) {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude and longitude must be provided together",
      path: ["latitude"],
    });
  }
  if (value.latitude !== undefined && (value.latitude < -90 || value.latitude > 90)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude must be between -90 and 90",
      path: ["latitude"],
    });
  }
  if (
    value.longitude !== undefined &&
    (value.longitude < -180 || value.longitude > 180)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Longitude must be between -180 and 180",
      path: ["longitude"],
    });
  }
}

function applyDateRefinement(
  value: { startAt?: Date; endAt?: Date },
  ctx: z.RefinementCtx,
) {
  if (value.startAt && value.endAt && value.endAt <= value.startAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time",
      path: ["endAt"],
    });
    return;
  }
  if (value.startAt && value.endAt) {
    const maxDuration = 1000 * 60 * 60 * 24 * 366;
    if (value.endAt.getTime() - value.startAt.getTime() > maxDuration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A single experience cannot span more than one year",
        path: ["endAt"],
      });
    }
  }
}

export const experienceCreateSchema = z
  .object({
    title: cleaned(160, 3),
    summary: cleaned(2000, 20),
    category: categorySchema,
    locationName: cleaned(160, 2),
    ...locationRefinement,
    startAt: isoDate,
    endAt: isoDate,
    visibility: visibilitySchema.default("private"),
    showExactLocation: booleanInput.default(false),
    confirmLocation: booleanInput.default(false),
    claims: z.array(claimInputSchema).min(1).max(12),
    participants: z.array(participantInputSchema).max(20).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    applyDateRefinement(value, ctx);
    applyCoordinateRefinement(value, ctx);
  });

export const experienceUpdateSchema = z
  .object({
    title: cleaned(160, 3).optional(),
    summary: cleaned(2000, 20).optional(),
    category: categorySchema.optional(),
    locationName: cleaned(160, 2).optional(),
    ...locationRefinement,
    startAt: isoDate.optional(),
    endAt: isoDate.optional(),
    visibility: visibilitySchema.optional(),
    showExactLocation: booleanInput.optional(),
    claims: z.array(claimInputSchema).min(1).max(12).optional(),
    participants: z.array(participantInputSchema).max(20).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    applyDateRefinement(value, ctx);
    applyCoordinateRefinement(value, ctx);
  });

export const publishSchema = z.object({
  action: z.enum(["publish", "unpublish"]).default("publish"),
});

export const inviteWitnessSchema = z
  .object({
    claimId: z.string().trim().min(1).max(64),
    name: cleaned(120, 2),
    email,
  })
  .strict();

export const attestationSubmissionSchema = z
  .object({
    name: cleaned(120, 2),
    relationship: cleaned(200, 3),
    confirmName: z.literal(true, "Confirm that this is your name"),
    confirmRelationship: z.literal(
      true,
      "Confirm your relationship to the creator or experience",
    ),
  })
  .strict();

export const attestationTokenSchema = z
  .string()
  .min(20)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid attestation token");

export const adminActionSchema = z
  .object({
    action: z.enum(["flag", "unflag", "revoke", "restore"]),
    reason: cleaned(500, 5),
  })
  .strict();

export const registerSchema = z
  .object({
    name: cleaned(120, 2),
    handle,
    email,
    password,
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    name: cleaned(120, 2),
    handle,
    bio: optionalCleaned(800),
    avatarUrl: z.preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const sanitized = sanitizeText(value);
        return sanitized.length === 0 ? undefined : sanitized;
      },
      z
        .string()
        .max(1000)
        .url("Enter a valid URL")
        .refine((value) => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
          } catch {
            return false;
          }
        }, "Avatar URL must use http or https")
        .optional(),
    ),
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    confirmation: z.literal("DELETE", "Type DELETE to confirm"),
  })
  .strict();

export const evidenceActionSchema = z
  .object({
    type: z.enum(["location_confirmed", "device_attested"]),
    note: optionalCleaned(300),
  })
  .strict();

export const attestationSubmitSchema = attestationSubmissionSchema;

export function zodDetails(error: z.ZodError) {
  return error.issues.slice(0, 20).map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export type ExperienceCreateInput = z.infer<typeof experienceCreateSchema>;
export type ExperienceUpdateInput = z.infer<typeof experienceUpdateSchema>;
export type ClaimInput = z.infer<typeof claimInputSchema>;
export type ParticipantInput = z.infer<typeof participantInputSchema>;

export const visibilityUpdateSchema = z
  .object({
    visibility: visibilitySchema,
  })
  .strict();
