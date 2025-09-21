import { Injectable, Logger } from "@nestjs/common";

export type UserRecord = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly users = new Map<string, UserRecord>();

  upsert(user: Partial<UserRecord> & { id: string }): UserRecord {
    const existing = this.users.get(user.id);
    const now = Date.now();
    const record: UserRecord = {
      id: user.id,
      firstName: user.firstName ?? existing?.firstName,
      lastName: user.lastName ?? existing?.lastName,
      email: user.email ?? existing?.email,
      avatar: user.avatar ?? existing?.avatar,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.users.set(record.id, record);
    if (existing) this.logger.debug(`Updated user ${record.id}`);
    else this.logger.log(`Created user ${record.id}`);
    return record;
  }

  findById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }
}
