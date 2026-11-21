import { Injectable, Module, OnApplicationShutdown, HttpException, HttpStatus } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";

@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    this.pool.on("error", () => console.error("An idle PostgreSQL connection failed"));
  }

  async transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async limit(bucket: string, maximum: number, description = "Too many requests. Try again later.") {
    const { rows } = await this.pool.query<{ hits: number; reset_at: Date }>(
      `INSERT INTO rate_limits (bucket, window_start, hits)
       VALUES ($1, date_trunc('hour', now()), 1)
       ON CONFLICT (bucket, window_start) DO UPDATE SET hits = LEAST(rate_limits.hits + 1, $2 + 1)
       RETURNING hits, window_start + interval '1 hour' AS reset_at`,
      [bucket, maximum],
    );
    if (rows[0].hits > maximum) {
      throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message: description,
        retryAt: rows[0].reset_at.toISOString() }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

@Module({ providers: [Database], exports: [Database] })
export class DatabaseModule {}
