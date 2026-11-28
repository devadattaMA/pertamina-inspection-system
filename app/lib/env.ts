function parsePostgresUrl(value: string, name: string): URL {
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { throw new Error(`${name} must be a valid PostgreSQL URL.`); }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use the PostgreSQL URL scheme.`);
  }
  if (parsed.searchParams.get("sslmode") !== "require") {
    throw new Error(`${name} must include ?sslmode=require.`);
  }
  return parsed;
}

export function getDatabaseUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const value = env.DATABASE_URL?.trim();
  if (!value) throw new Error("Missing required environment variable: DATABASE_URL.");
  if (!parsePostgresUrl(value, "DATABASE_URL").hostname.includes("-pooler")) {
    throw new Error("DATABASE_URL must use the pooled Neon hostname (-pooler).");
  }
  return value;
}

export function getDirectUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const value = env.DIRECT_URL?.trim();
  if (!value) throw new Error("Missing required environment variable: DIRECT_URL.");
  if (parsePostgresUrl(value, "DIRECT_URL").hostname.includes("-pooler")) {
    throw new Error("DIRECT_URL must use the direct Neon hostname without -pooler.");
  }
  return value;
}

export function getAuthSecret(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const value = env.AUTH_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return value;
}
