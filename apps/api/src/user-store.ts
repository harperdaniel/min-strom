import { randomUUID } from "node:crypto";

import {
  DuplicateUsernameError,
  type CreateUserInput,
  type LinkElviaTokenInput,
  type UserRecord,
  type UserRepository
} from "@minstrom/database";

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    if (await this.findUserByUsername(input.username)) {
      throw new DuplicateUsernameError(input.username);
    }

    const now = new Date();
    const user: UserRecord = {
      createdAt: now,
      deletedAt: null,
      elviaLastErrorCode: null,
      elviaLinkedAt: null,
      elviaLinkStatus: "NOT_LINKED",
      id: randomUUID(),
      lastLoginAt: null,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      updatedAt: now,
      username: input.username
    };

    this.users.set(user.id, user);

    return user;
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findUserByUsername(username: string): Promise<UserRecord | null> {
    for (const user of this.users.values()) {
      if (user.username === username && user.deletedAt === null) {
        return Promise.resolve(user);
      }
    }

    return Promise.resolve(null);
  }

  async linkElviaToken(
    userId: string,
    input: LinkElviaTokenInput
  ): Promise<UserRecord> {
    const user = await this.requireUser(userId);
    const updated: UserRecord = {
      ...user,
      elviaLastErrorCode: input.lastErrorCode,
      elviaLinkedAt: new Date(),
      elviaLinkStatus: input.status,
      updatedAt: new Date()
    };

    this.users.set(userId, updated);

    return updated;
  }

  async markLogin(userId: string): Promise<UserRecord> {
    const user = await this.requireUser(userId);
    const updated: UserRecord = {
      ...user,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(userId, updated);

    return updated;
  }

  private async requireUser(userId: string): Promise<UserRecord> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new Error("User was not found.");
    }

    return user;
  }
}
