# Commander Backend

Commander Backend is a small Express API for storing and resolving command-based text snippets such as `/hello` or `/hi1`.

It supports two modes:

- Local JSON-backed development mode
- MongoDB-backed persistent mode

## Features

- Create, read, update, and delete command snippets
- Resolve a snippet by trigger through `/api/commands?trigger=...`
- Swagger docs at `/api-docs`
- Local and MongoDB storage modes
- Example requests in `backend/api.http`

## Tech Stack

- Node.js
- Express 5
- MongoDB and Mongoose
- dotenv
- Swagger

## Quick Start

```bash
git clone https://github.com/JDXE22/commander_backend.git
cd commander_backend/backend
npm install
```

Create a `.env` file inside `backend`:

```env
PORT=1234
DATABASE_URL=mongodb://127.0.0.1:27017/commander
```

Run one of the available modes:

```bash
npm run local
```

```bash
npm start
```

## Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run local` | Start the local JSON-backed server |
| `npm start`     | Start the MongoDB-backed server    |
| `npm test`      | Placeholder test script            |

## Documentation

- Architecture, folders, and API reference: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Example requests: [backend/api.http](./backend/api.http)

## License

ISC
