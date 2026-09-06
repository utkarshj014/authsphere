import { prisma } from "../../src/lib/prisma.js";
import { hashPassword } from "../../src/lib/crypto/password.js";
import { generateToken, hashToken } from "../../src/lib/crypto/token.js";
import { encryptMfaSecret } from "../../src/lib/crypto/mfa-encryption.js";
import { generateRecoveryCodes } from "../../src/lib/crypto/recovery-codes.js";
import { totp } from "../../src/lib/totp/index.js";

let userCounter = 1;

export function getNextUserEmail(): string {
  return `test-${userCounter++}-${Date.now()}@authsphere.test`;
}

export const DEFAULT_TEST_PASSWORD = "Password123!";
let cachedDefaultPasswordHash: string | null = null;

async function getDefaultPasswordHash(): Promise<string> {
  if (!cachedDefaultPasswordHash) {
    cachedDefaultPasswordHash = await hashPassword(DEFAULT_TEST_PASSWORD);
  }
  return cachedDefaultPasswordHash;
}

let cachedRoles: Record<string, string> = {};

export async function getRoleId(roleName: "USER" | "ADMIN"): Promise<string> {
  if (cachedRoles[roleName]) {
    return cachedRoles[roleName];
  }
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });
  cachedRoles[roleName] = role.id;
  return role.id;
}

export interface CreateUserOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified?: boolean;
  role?: "USER" | "ADMIN";
}

export async function createUser(options: CreateUserOptions = {}) {
  const plainPassword = options.password ?? DEFAULT_TEST_PASSWORD;
  const passwordHash =
    plainPassword === DEFAULT_TEST_PASSWORD
      ? await getDefaultPasswordHash()
      : await hashPassword(plainPassword);
  const roleId = await getRoleId(options.role ?? "USER");
  const email = options.email ?? getNextUserEmail();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: options.firstName ?? "Test",
      lastName: options.lastName ?? "User",
      isEmailVerified: options.isEmailVerified ?? false,
      verifiedAt: options.isEmailVerified ? new Date() : null,
      roleId,
    },
    include: {
      role: true,
    },
  });

  return { user, password: plainPassword };
}

export async function createVerifiedUser(options: CreateUserOptions = {}) {
  return createUser({
    ...options,
    isEmailVerified: true,
  });
}

export async function createAdmin(options: CreateUserOptions = {}) {
  return createUser({
    ...options,
    role: "ADMIN",
    isEmailVerified: true,
  });
}

export async function createMfaUser(
  options: CreateUserOptions & { secret?: string } = {},
) {
  const plainPassword = options.password ?? DEFAULT_TEST_PASSWORD;
  const passwordHash =
    plainPassword === DEFAULT_TEST_PASSWORD
      ? await getDefaultPasswordHash()
      : await hashPassword(plainPassword);
  const roleId = await getRoleId(options.role ?? "USER");
  const email = options.email ?? getNextUserEmail();
  const rawSecret = options.secret ?? totp.generateSecret();
  const encryptedSecret = encryptMfaSecret(rawSecret);

  const { recoveryCodes, recoveryCodeHashes } = generateRecoveryCodes(10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: options.firstName ?? "Mfa",
      lastName: options.lastName ?? "User",
      isEmailVerified: true,
      verifiedAt: new Date(),
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
      roleId,
      mfaRecoveryCodes: {
        create: recoveryCodeHashes.map((codeHash) => ({
          codeHash,
        })),
      },
    },
    include: {
      role: true,
      mfaRecoveryCodes: true,
    },
  });

  return {
    user,
    password: plainPassword,
    rawSecret,
    recoveryCodes,
    recoveryCodeHashes,
  };
}

export async function createOAuthUser(
  provider: "GOOGLE" | "GITHUB" = "GOOGLE",
  providerId?: string,
  options: CreateUserOptions = {},
) {
  const roleId = await getRoleId(options.role ?? "USER");
  const email = options.email ?? getNextUserEmail();
  const effectiveProviderId =
    providerId ?? `oauth-id-${userCounter++}-${Date.now()}`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: null,
      firstName: options.firstName ?? "OAuth",
      lastName: options.lastName ?? "User",
      isEmailVerified: true,
      verifiedAt: new Date(),
      roleId,
      oauthAccounts: {
        create: {
          provider,
          providerId: effectiveProviderId,
        },
      },
    },
    include: {
      role: true,
      oauthAccounts: true,
    },
  });

  return { user, provider, providerId: effectiveProviderId };
}

/**
 * Creates a database session record for testing session lifecycle queries and revocations.
 * Note: `rawToken` is an opaque test token, not a signed JWT.
 */
export async function createSession(
  userId: string,
  overrides: { expiresAt?: Date; ipAddress?: string; userAgent?: string } = {},
) {
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt =
    overrides.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: overrides.ipAddress ?? "127.0.0.1",
      userAgent: overrides.userAgent ?? "Vitest-Agent/1.0",
    },
  });

  return { session, rawToken };
}

export async function createExpiredSession(
  userId: string,
  overrides: { ipAddress?: string; userAgent?: string } = {},
) {
  return createSession(userId, {
    ...overrides,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day expired
  });
}
