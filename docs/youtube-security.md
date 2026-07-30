# YouTube Security

## Threat model (MVP)

- Token theft from DB / logs / XSS
- CSRF on OAuth connect
- Cross-organization data access
- Scope abuse (write comments)
- Quota / cost abuse
- Open redirect on OAuth

## Controls

| Area | Control |
| --- | --- |
| Tokens | AES-256-GCM; server-only; never in client JSON |
| OAuth | state nonce, fixed redirect URI, single-use |
| AuthZ | every query filters `organizationId` from `getAuthContext()` |
| Write APIs | denylist in `YouTubeApiClient` |
| Logging | redact Authorization headers and token fields |
| Disconnect | wipe ciphertext; best-effort Google revoke |
| URL import | parse allowlisted hosts; reject non-video URLs |
| Admin | no raw token views; status only |
| Rate limit | per-org job enqueue limits (Y7) |

## Encryption

- Key: `TOKEN_ENCRYPTION_KEY` (base64, 32 bytes)
- Format: `v1:iv:ciphertext:tag` (base64 parts)
- Rotation: support key version prefix later (`v2:`)

## Privacy / deletion

User actions:

1. Disconnect (keep analysis optional)
2. Delete comments for video / all
3. Delete translations only
4. Delete AI results
5. Org wipe (existing cascade + YouTube tables)

Show impact counts before destructive confirms.

## Compliance notes for production

- OAuth consent screen + privacy policy + terms URLs required for Google verification
- Sensitive scope verification for `youtube.force-ssl`
- Data retention policy for `rawPayload` (store minimal; purge policy Y7)

## Alternatives

- KMS-managed keys — preferred later; local key ok for MVP with strong secret management on Vercel
