import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { Prisma } from "../generated/prisma/client.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { ConflictError, UnauthorizedError } from "../utils/http-error.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Cliente JWKS a nivel de módulo: cachea las llaves públicas del emisor para no golpear a
 * auth-system-dotnet en cada request. Con `cacheMaxAge` una llave se reusa una hora.
 */
const jwksClient = new JwksClient({
  jwksUri: env.jwksUri,
  cache: true,
  cacheMaxAge: 3_600_000,
  rateLimit: true,
});

/** Resuelve la pública RSA que corresponde al `kid` del header del token. */
async function getSigningKey(token: string): Promise<string> {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header.kid;
  if (!kid) {
    throw new UnauthorizedError("Token inválido o expirado.");
  }

  const key = await jwksClient.getSigningKey(kid);
  return key.getPublicKey();
}

/** ClaimTypes.Email; auth-system-dotnet emits both the short and the long form. */
const EMAIL_CLAIM_URI = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

type AccessTokenPayload = jwt.JwtPayload & {
  email?: string;
  [EMAIL_CLAIM_URI]?: string;
};

/**
 * Identity lives in auth-system-dotnet, so the first time a token arrives we mirror the
 * user locally: the row exists only to hang categories, transactions and budgets off it.
 */
async function ensureLocalUser(id: string, email: string) {
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (existing) return;

  try {
    await prisma.user.create({ data: { id, email } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Either a concurrent request created the same mirror, or the email belongs to a
      // different id — only the second case is an actual conflict.
      const created = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (created) return;
      throw new ConflictError("El email del token ya está asociado a otra cuenta.");
    }
    throw error;
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token de autenticación.");
  }

  const token = header.slice("Bearer ".length);

  let payload: AccessTokenPayload;
  try {
    const publicKey = await getSigningKey(token);
    // `algorithms` fija RS256: sin esa lista, el `alg` del header decidiría cómo se verifica y
    // un atacante podría usar `none` o firmar con HMAC usando la pública como secreto.
    payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      clockTolerance: 30,
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Token inválido o expirado.");
  }

  const userId = payload.sub;
  const email = payload.email || payload[EMAIL_CLAIM_URI];
  if (!userId || !email) {
    throw new UnauthorizedError("El token no contiene los datos de usuario esperados.");
  }

  await ensureLocalUser(userId, email);
  req.userId = userId;
  next();
}
