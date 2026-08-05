import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { type ApiConfig } from "./config.js";

export const credentialKeyVersion = 1;

export function encryptCredential(plaintext: string, config: ApiConfig): string {
  const key = getCredentialEncryptionKey(config);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    `v${credentialKeyVersion}`,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(":");
}

export function decryptCredential(payload: string, config: ApiConfig): string {
  const [version, ivBase64, tagBase64, encryptedBase64] = payload.split(":");

  if (
    version !== `v${credentialKeyVersion}` ||
    !ivBase64 ||
    !tagBase64 ||
    !encryptedBase64
  ) {
    throw new Error("Credential payload has an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getCredentialEncryptionKey(config),
    Buffer.from(ivBase64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function getCredentialEncryptionKey(config: ApiConfig): Buffer {
  if (config.CREDENTIAL_ENCRYPTION_KEY) {
    return createHash("sha256").update(config.CREDENTIAL_ENCRYPTION_KEY).digest();
  }

  if (config.NODE_ENV === "production") {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be set in production.");
  }

  return createHash("sha256")
    .update("minstrom-local-development-credential-key")
    .digest();
}
