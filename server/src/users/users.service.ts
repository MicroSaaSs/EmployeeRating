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
  private readonly professionals: any[] = [];

  private readonly activities: any[] = [];

  getProfileById(id: string) {
    return this.professionals.find((p) => String(p.id) === String(id)) || null;
  }

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

  // Professionals APIs
  listTrendingProfessionals() {
    return this.professionals.filter((p) => !!p.trending);
  }

  searchProfessionals() {
    return [...this.professionals];
  }

  listSuggestions(q?: string) {
    const pool = [
      ...new Set(
        this.professionals.flatMap((p) => [
          p.name,
          p.company,
          p.title,
          ...(Array.isArray(p.skills) ? p.skills : []),
        ])
      ),
    ];
    const query = (q || "").toLowerCase();
    return pool.filter((s) => s.toLowerCase().includes(query)).slice(0, 10);
  }

  listRecentActivities(filter: "all" | "received" | "given" = "all") {
    return this.activities.filter((a) => {
      if (filter === "all") return true;
      return filter === "received"
        ? a.type === "rating_received"
        : a.type === "rating_given";
    });
  }

  // CRUD for professionals (in-memory)
  createProfessional(input: any) {
    const id = String(input.id ?? Date.now());
    const record = { id, ...input };
    this.professionals.push(record);
    this.logger.log(`Professional created id=${id}`);
    return record;
  }

  updateProfessional(id: string, input: any) {
    const idx = this.professionals.findIndex(
      (p) => String(p.id) === String(id)
    );
    if (idx === -1) return null;
    this.professionals[idx] = { ...this.professionals[idx], ...input, id };
    this.logger.debug(`Professional updated id=${id}`);
    return this.professionals[idx];
  }

  deleteProfessional(id: string) {
    const before = this.professionals.length;
    const next = this.professionals.filter((p) => String(p.id) !== String(id));
    const removed = next.length !== before;
    if (removed) this.logger.log(`Professional deleted id=${id}`);
    (this as any).professionals = next;
    return removed;
  }

  getProfessionalById(id: string) {
    return this.professionals.find((p) => String(p.id) === String(id)) || null;
  }

  // CRUD for activities (in-memory)
  createActivity(input: any) {
    const id = String(input.id ?? Date.now());
    const record = { id, ...input };
    this.activities.unshift(record);
    this.logger.log(`Activity created id=${id}`);
    return record;
  }

  deleteActivity(id: string) {
    const before = this.activities.length;
    const next = this.activities.filter((a) => String(a.id) !== String(id));
    const removed = next.length !== before;
    if (removed) this.logger.log(`Activity deleted id=${id}`);
    (this as any).activities = next;
    return removed;
  }
}
