import { Pool, type PoolClient, type PoolConfig } from "pg";

export const ELVIA_LINK_STATUSES = [
  "NOT_LINKED",
  "LINKED_PENDING_FETCH",
  "ACTIVE",
  "ERROR"
] as const;

export type ElviaLinkStatus = (typeof ELVIA_LINK_STATUSES)[number];

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  elviaLinkStatus: ElviaLinkStatus;
  elviaLinkedAt: Date | null;
  elviaLastErrorCode: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserInput {
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

export interface LinkElviaTokenInput {
  encryptedToken: string;
  keyVersion: number;
  status: ElviaLinkStatus;
  lastErrorCode: string | null;
}

export interface UserRepository {
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  linkElviaToken(userId: string, input: LinkElviaTokenInput): Promise<UserRecord>;
  markLogin(userId: string): Promise<UserRecord>;
}

export class DuplicateUsernameError extends Error {
  constructor(username: string) {
    super(`Username is already taken: ${username}`);
    this.name = "DuplicateUsernameError";
  }
}

interface UserRow {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  elviaLinkStatus: ElviaLinkStatus;
  elviaLinkedAt: Date | null;
  elviaLastErrorCode: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const userSelect = `
  id,
  username,
  password_hash AS "passwordHash",
  password_salt AS "passwordSalt",
  elvia_link_status AS "elviaLinkStatus",
  elvia_linked_at AS "elviaLinkedAt",
  elvia_last_error_code AS "elviaLastErrorCode",
  last_login_at AS "lastLoginAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  deleted_at AS "deletedAt"
`;

function asDuplicateUsername(error: unknown, username: string): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return new DuplicateUsernameError(username);
  }

  return error instanceof Error ? error : new Error("Unknown database error.");
}

export async function runUserMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await runWithClient(pool, async (client) => {
      await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          username varchar(80),
          password_hash text,
          password_salt text,
          elvia_token_encrypted text,
          elvia_token_key_version integer,
          elvia_link_status varchar(40) NOT NULL DEFAULT 'NOT_LINKED',
          elvia_linked_at timestamptz,
          elvia_last_error_code text,
          last_login_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        )
      `);
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(80)"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt text"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS elvia_token_encrypted text"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS elvia_token_key_version integer"
      );
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS elvia_link_status varchar(40) NOT NULL DEFAULT 'NOT_LINKED'
      `);
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS elvia_linked_at timestamptz"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS elvia_last_error_code text"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz"
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz"
      );
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email'
          ) THEN
            ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
          END IF;
        END $$;
      `);
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email'
          ) THEN
            UPDATE users
            SET username = lower(split_part(email, '@', 1) || '-' || substring(id::text, 1, 8))
            WHERE username IS NULL;
          ELSE
            UPDATE users
            SET username = 'legacy-' || substring(id::text, 1, 8)
            WHERE username IS NULL;
          END IF;
        END $$;
      `);
      await client.query(`
        UPDATE users
        SET
          password_hash = COALESCE(password_hash, 'legacy-disabled'),
          password_salt = COALESCE(password_salt, 'legacy-disabled')
        WHERE password_hash IS NULL OR password_salt IS NULL
      `);
      await client.query(`
        ALTER TABLE users
        ALTER COLUMN username SET NOT NULL,
        ALTER COLUMN password_hash SET NOT NULL,
        ALTER COLUMN password_salt SET NOT NULL
      `);
      await client.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)"
      );
    });
  } finally {
    await pool.end();
  }
}

export class PostgresUserRepository implements UserRepository {
  private readonly pool: Pool;

  constructor(config: PoolConfig | string) {
    this.pool =
      typeof config === "string"
        ? new Pool({ connectionString: config })
        : new Pool(config);
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    try {
      const result = await this.pool.query<UserRow>(
        `
          INSERT INTO users (username, password_hash, password_salt)
          VALUES ($1, $2, $3)
          RETURNING ${userSelect}
        `,
        [input.username, input.passwordHash, input.passwordSalt]
      );

      return requireUserRow(result.rows[0]);
    } catch (error) {
      throw asDuplicateUsername(error, input.username);
    }
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `
        SELECT ${userSelect}
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `
        SELECT ${userSelect}
        FROM users
        WHERE username = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [username]
    );

    return result.rows[0] ?? null;
  }

  async linkElviaToken(
    userId: string,
    input: LinkElviaTokenInput
  ): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `
        UPDATE users
        SET
          elvia_token_encrypted = $2,
          elvia_token_key_version = $3,
          elvia_link_status = $4,
          elvia_linked_at = now(),
          elvia_last_error_code = $5,
          updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING ${userSelect}
      `,
      [
        userId,
        input.encryptedToken,
        input.keyVersion,
        input.status,
        input.lastErrorCode
      ]
    );

    return requireUserRow(result.rows[0]);
  }

  async markLogin(userId: string): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `
        UPDATE users
        SET last_login_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING ${userSelect}
      `,
      [userId]
    );

    return requireUserRow(result.rows[0]);
  }
}

async function runWithClient<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

function requireUserRow(row: UserRow | undefined): UserRecord {
  if (!row) {
    throw new Error("User was not found.");
  }

  return row;
}
