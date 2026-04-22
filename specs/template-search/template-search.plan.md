# Template Search Endpoint - Technical Plan

## Architecture Alignment

- Runtime: Node.js + Express (existing backend stack).
- Auth: Existing `authMiddleware` with JWT, using `req.user.userId` for scoping.
- Persistence: MongoDB via Mongoose.
- Current data model note: existing command schema uses `text`; API contract for this feature uses `content`. During implementation, map `content <-> text` consistently unless schema migration is completed.

## API Route Definition

- Method: `GET`
- Path: `/api/v2/templates/search`
- Auth: Required (`Authorization: Bearer <token>`)
- Purpose: Return fast, user-scoped template suggestions for keyword/command input.

## Request Contract

### Query Parameters

| Name    | Type    | Required | Default | Rules                                                                |
| ------- | ------- | -------- | ------- | -------------------------------------------------------------------- |
| `q`     | string  | Yes      | -       | Trimmed; min length 1; max length 100; case-insensitive search input |
| `limit` | integer | No       | 8       | Range 1-20; used for realtime suggestions                            |

### Query Interpretation Rules

1. Compute `isCommandQuery = q.startsWith("/")` after trim.
2. Always apply base filter `{ userId: req.user.userId }`.
3. If `isCommandQuery` is true:
   - prioritize command matching (`exact` > `prefix` > `contains`),
   - then include content matches if remaining slots exist.
4. If `isCommandQuery` is false:
   - prioritize content contains matches,
   - optionally include command contains matches in the same result set.
5. All matching is case-insensitive.

## Response Contract

### 200 OK

```json
{
  "query": "/hi",
  "limit": 8,
  "total": 2,
  "templates": [
    {
      "id": "661e8f7ad7b3cd0012459aa1",
      "name": "Greeting 1",
      "content": "Hi there, welcome to the channel",
      "command": "/hi1",
      "match": "command-prefix"
    },
    {
      "id": "661e8f8ed7b3cd0012459aa2",
      "name": "Greeting 2",
      "content": "Hello and welcome",
      "command": "/hi2",
      "match": "command-contains"
    }
  ]
}
```

- `match` is optional but recommended to aid debugging/ranking visibility.
- `total` is the returned result count, not the full cardinality of all potential matches.

### 400 Bad Request

```json
{
  "error": "ValidationError",
  "message": "Query parameter 'q' must be a non-empty string with max length 100"
}
```

### 401 Unauthorized

```json
{
  "error": "UnauthorizedError",
  "message": "Invalid or expired token"
}
```

## Example Requests

### Keyword Search

```http
GET /api/v2/templates/search?q=welcome&limit=5
Authorization: Bearer <token>
```

### Command Search (Prioritized)

```http
GET /api/v2/templates/search?q=/hi
Authorization: Bearer <token>
```

## Query Strategy (Implementation Guidance)

1. Normalize input once (`qTrimmed`, `qLower`).
2. Use projection to only return required fields (`_id`, `name`, `text/content`, `command`).
3. Use `limit` early to control payload and latency.
4. For command queries, apply weighted ranking logic:
   - score 3: exact command match
   - score 2: command prefix match
   - score 1: command contains match
   - score 0: content-only fallback
5. Sort by score desc, then `updatedAt` desc to keep suggestions useful.

## Performance and Indexing Considerations

### Recommended Schema Additions (for speed)

- Add normalized fields written at create/update time:
  - `commandLower`
  - `contentLower` (or `textLower` if schema still uses `text`)

### Recommended Indexes

1. Compound index for ownership and command-first search:
   - `{ userId: 1, commandLower: 1 }`
2. Compound index for ownership and recency tie-breaker:
   - `{ userId: 1, updatedAt: -1 }`
3. Optional advanced search for high scale:
   - MongoDB Atlas Search index over command/content for low-latency autocomplete.

### Notes

- Avoid unbounded regex on large collections without normalized/indexed strategy.
- Keep `limit` small for realtime suggestion behavior.
- Consider short per-user response caching (1-5 seconds) only if traffic requires it.

## Security and Data Isolation

- Must never trust `userId` from query/body.
- Must derive tenant scope only from verified JWT (`req.user.userId`).
- Must not return fields outside the suggestion contract.

## Edge Case Handling

- No results: return `200` with empty `templates` array.
- Invalid `limit`: clamp or reject (recommended: reject with `400` for explicit API behavior).
- Query `/` only: return top command suggestions for user by recency (bounded), if any.

## Test and Verification Plan

- Unit tests for query classifier (`isCommandQuery`).
- Unit tests for ranking behavior (`exact > prefix > contains > content`).
- Integration tests ensuring strict user scoping.
- Integration tests for case-insensitive matching in both command and content.
- Load check on realistic dataset to validate latency target.
