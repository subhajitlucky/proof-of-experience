import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey } = generateKeyPairSync("ed25519");
const signing = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const encryption = randomBytes(32).toString("base64");
const authSecret = randomBytes(32).toString("base64");

console.log("# Add these values to .env. Keep them out of version control.\n");
console.log(`NEXTAUTH_SECRET="${authSecret}"`);
console.log(`RECORD_SIGNING_PRIVATE_KEY="${signing}"`);
console.log(`DATA_ENCRYPTION_KEY="${encryption}"`);
