import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Cap the pool below the pooler's ceiling.
 *
 * DATABASE_URL points at Supabase's Supavisor host on port 5432, which is
 * SESSION mode. A session-mode connection is pinned to one backend for the
 * lifetime of the client connection, so every socket this pool holds — idle
 * included — consumes one of Supavisor's 15 slots for the whole project.
 * `pg` defaults to 10 per client, and any other client in the project (Prisma
 * CLI, scripts, another running server) draws from the same 15.
 *
 * Measured against this database, sampling local TCP connections to 5432:
 *   - default pool (10) under 60 concurrent page renders: peak 10 client
 *     connections and 13 responses failed with
 *     `EMAXCONNSESSION: max clients reached in session mode - pool_size: 15`.
 *   - cap 8 under 90 concurrent page renders, repeated three times: peak 8,
 *     90/90 HTTP 200, zero pooler errors.
 * Note that `pg_stat_activity` overstates usage here — Supavisor keeps 15 warm
 * backends even when few clients are connected.
 *
 * Every process counts against the same 15, so multi-process runs matter:
 * `next build` spawns 3 collect-data workers and peaked at 11 connections with
 * the default cap, close to the ceiling. See `resolvePoolMax` for the build
 * case.
 *
 * Prisma queues work beyond the pool size, so a smaller pool costs throughput,
 * never correctness — as long as queued work is allowed to wait rather than
 * fail. `connectionTimeoutMillis` is deliberately generous: an earlier 15s
 * value turned a brief queue into hard 500s under load. The ceiling is roughly
 * 90 concurrent renders; beyond that the queue outlasts the timeout (P2028).
 * Raise the cap with DATABASE_POOL_MAX if the pooler limit increases, or move
 * to transaction mode (port 6543 + pgbouncer=true) once prepared statements
 * have been validated for this workload.
 */
const DEFAULT_POOL_MAX = 8;
const BUILD_POOL_MAX = 2;

/**
 * `next build` renders pages in several worker processes at once, and each one
 * constructs its own PrismaClient with its own pool. With the default cap that
 * is 3 x 8 = 24 sockets competing for Supavisor's 15 slots, which fails the
 * build with EMAXCONNSESSION on `/sitemap.xml`. Workers get a small pool
 * instead: 3 x 2 = 6 measured peak, leaving room for the build's other
 * Prisma-using processes. Prisma queues rather than fails, so a build worker
 * costs a little time instead of correctness.
 *
 * Detection is by `NEXT_PHASE` rather than `NEXT_PRIVATE_BUILD_WORKER`, which is
 * not exported into the render workers that actually reach Prisma (verified by
 * logging both during a real build).
 */
function resolvePoolMax(): number {
  const override = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
  if (Number.isFinite(override) && override > 0) return override;
  return process.env.NEXT_PHASE === "phase-production-build"
    ? BUILD_POOL_MAX
    : DEFAULT_POOL_MAX;
}

const poolMax = resolvePoolMax();

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: poolMax,
    connectionTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
