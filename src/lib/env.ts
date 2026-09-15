import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const authServiceUrl = required("AUTH_SERVICE_URL").replace(/\/+$/, "");

export const env = {
  port: Number(process.env.PORT ?? 4000),
  /** Base URL de auth-system-dotnet, el emisor de los tokens. */
  authServiceUrl,
  /** JWKS público del emisor: de aquí sale la clave RSA con la que se verifica la firma. */
  jwksUri: `${authServiceUrl}/.well-known/jwks.json`,
  jwtIssuer: process.env.JWT_ISSUER ?? "AuthSystem",
  jwtAudience: process.env.JWT_AUDIENCE ?? "AuthSystem.Clients",
};
