# YouTube OAuth Flow

## Flow type

Google OAuth 2.0 **Authorization Code** with `access_type=offline` and `prompt=consent` on first connect / reconnect to maximize refresh token issuance.

## Scopes (MVP)

```text
openid
email
profile
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.force-ssl
```

### Why `youtube.force-ssl`?

Google’s `commentThreads.list` / `comments.list` require this scope (or full `youtube`) when calling with a user OAuth token. There is no narrower “comments read-only” scope.

**Mitigation:** application layer **hard-blocks** all write endpoints (`comments.insert`, `update`, `delete`, `setModerationStatus`, etc.). Future reply features require a separate consent + scope expansion flow.

`youtube.readonly` covers channel/video listing (`channels.list mine=true`, `search.list forMine`, `videos.list`).

## Routes

| Route | Role |
| --- | --- |
| `GET /api/integrations/youtube/connect` | Create state cookie, redirect to Google |
| `GET /api/integrations/youtube/callback` | Validate state, exchange code, encrypt tokens, upsert connection + channel |
| `POST /api/integrations/youtube/disconnect` | Revoke at Google (best effort), wipe tokens, set DISCONNECTED |
| `GET /api/integrations/youtube/status` | Safe status DTO (no tokens) |
| `POST /api/integrations/youtube/reconnect` | Same as connect with `prompt=consent` |

## Security controls

1. **state** — random 32+ bytes, stored in httpOnly secure cookie (or signed server session), single-use, TTL ~10 min.
2. **CSRF** — state binding + SameSite cookie.
3. **redirect URI** — fixed `GOOGLE_REDIRECT_URI` / `APP_URL` allowlist; never accept client-provided redirect.
4. **Token storage** — AES-256-GCM with `TOKEN_ENCRYPTION_KEY` (32-byte base64). Ciphertext only in DB.
5. **Never log/return tokens** — redact in errors; status API returns booleans/timestamps only.
6. **Org check** — connection always tied to `getAuthContext().organizationId`.

## Token refresh

Before YouTube API calls:

```text
if accessTokenExpiresAt < now + 60s
  → refresh with encryptedRefreshToken
  → on invalid_grant → status=REAUTH_REQUIRED
```

## User cancel / errors

| Case | UX |
| --- | --- |
| `access_denied` | Toast + return to settings with cancelled message |
| Missing refresh token | Save access token; mark REAUTH_REQUIRED if refresh later fails; prompt reconnect with consent |
| Revoked | REAUTH_REQUIRED / REVOKED |
| State mismatch | 400, no token exchange |

## Dev without Google

When Google env vars missing:

- Settings page shows setup instructions
- `YOUTUBE_MOCK_OAUTH=true` creates a fake CONNECTED connection for UI/seed testing (no real tokens)

## Alternatives

- Use Clerk Google social and reuse session — Clerk does not reliably expose YouTube refresh tokens for Data API offline access. Rejected.
- Device flow — wrong UX for web app.

## Risks

- Refresh token only returned on first consent; reconnect must use `prompt=consent`.
- Google verification required for sensitive scopes in production.
