export function isConnectionRefused(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; errors?: { code?: string }[] };
  if (e.code === "ECONNREFUSED") return true;
  return e.errors?.some((inner) => inner.code === "ECONNREFUSED") ?? false;
}

export function printInfraHint(service: "postgres" | "minio"): void {
  console.error(`
Cannot connect to ${service === "postgres" ? "PostgreSQL" : "MinIO"}.

1. Start Docker Desktop
2. From the repo root, run:

   npm run docker:up
   docker compose ps

3. When services are healthy, run the seed command again.
`);
}
