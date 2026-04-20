# Template Search Endpoint - Specification

## Business Vision

As an authenticated user, I want to quickly search my own templates by keyword or command so I can reuse the right template with minimal typing.

## User Stories

### US-1: Keyword Search

As a user,
I want to type a keyword and see templates whose content includes that keyword,
So that I can find relevant templates even when I do not remember the command.

### US-2: Command-First Search

As a user,
I want command-like input (starting with "/") to prioritize command matches,
So that autocomplete suggestions feel fast and accurate when I know the command pattern.

### US-3: Strict Ownership

As a user,
I need search results to include only my own templates,
So that no other user's templates are exposed.

## Functional Requirements

| ID   | Requirement                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| FR-1 | The endpoint must require authentication and scope results to the authenticated user's `userId`.                         |
| FR-2 | The endpoint must support case-insensitive search.                                                                       |
| FR-3 | For non-command input, search must match partial or full text inside template `content`.                                 |
| FR-4 | Search must support exact or partial match for template `command`.                                                       |
| FR-5 | If input starts with `/`, results must prioritize `command` matches before `content`-only matches.                       |
| FR-6 | Response must be optimized for realtime/autocomplete suggestions (small payload, limited result count, stable ordering). |
| FR-7 | Endpoint must return only the fields needed by suggestions: `id`, `name`, `content`, `command`.                          |
| FR-8 | When no matches exist, endpoint must return success with an empty list (not a 404).                                      |
| FR-9 | Invalid query input (missing or too short/too long when required by contract) must return a validation error.            |

## Non-Functional Requirements

- NFR-1: P95 endpoint latency target <= 150 ms for normal payloads and indexed queries.
- NFR-2: Default response size should remain small (max 8 suggestions unless caller requests a lower/higher bounded value).
- NFR-3: Query behavior must be deterministic for stable autocomplete UX.

## Acceptance Criteria

- [ ] Authenticated request returns only templates where `template.userId == auth.userId`.
- [ ] Input `"welcome"` returns templates whose `content` contains `welcome`, case-insensitive.
- [ ] Input `"/hi"` returns command matches first, including exact and partial command matches.
- [ ] Input `"/HI1"` matches `"/hi1"` (case-insensitive).
- [ ] No matches returns `200` with `templates: []` and `total: 0`.
- [ ] Missing/invalid query input returns `400` with a clear validation message.
- [ ] Endpoint returns only API-safe suggestion fields.

## Edge Cases

- EC-1: Query is empty string after trim -> return `400` validation error.
- EC-2: Query is only `/` -> return command suggestions for user (bounded by `limit`) or empty list.
- EC-3: Query exceeds max length -> return `400` validation error.
- EC-4: User has no templates -> return `200` with empty list.
- EC-5: Mixed-case input should still match lowercase/uppercase stored values.

## Out of Scope

- Cross-user or admin/global template search.
- Semantic/vector similarity search.
- Fuzzy typo-correction beyond exact/partial matching.
