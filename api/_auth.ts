import type { VercelRequest } from '@vercel/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE

if (!AUTH0_DOMAIN) throw new Error('AUTH0_DOMAIN is not set')
if (!AUTH0_AUDIENCE) throw new Error('AUTH0_AUDIENCE is not set')

const ISSUER = `https://${AUTH0_DOMAIN}/`

// createRemoteJWKSet caches Auth0's signing keys at module scope, so warm
// function invocations don't refetch the JWKS on every request.
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))

/** Thrown when a request has no valid bearer token. */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Verify the incoming Auth0 access token and return the user id (sub claim).
 * Throws UnauthorizedError if the token is missing, malformed, expired, or
 * signed for a different issuer/audience.
 */
export async function requireUserId(req: VercelRequest): Promise<string> {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token')
  }
  const token = header.slice('Bearer '.length).trim()

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUTH0_AUDIENCE,
    })
    if (!payload.sub) throw new UnauthorizedError('Token has no subject')
    return payload.sub
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err
    throw new UnauthorizedError('Invalid token')
  }
}
