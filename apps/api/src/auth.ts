import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export interface PasswordHash {
  passwordHash: string;
  passwordSalt: string;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const passwordSalt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, passwordSalt, 64)) as Buffer;

  return {
    passwordHash: derived.toString("base64url"),
    passwordSalt
  };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string
): Promise<boolean> {
  const expected = Buffer.from(passwordHash, "base64url");
  const actual = (await scrypt(password, passwordSalt, expected.length)) as Buffer;

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
