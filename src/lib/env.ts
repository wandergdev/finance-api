import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  /** Shared signing key with auth-system-dotnet (Jwt:Secret). This API only verifies tokens. */
  jwtSecret: required("JWT_SECRET"),
  jwtIssuer: process.env.JWT_ISSUER ?? "AuthSystem",
  jwtAudience: process.env.JWT_AUDIENCE ?? "AuthSystem.Clients",
};
