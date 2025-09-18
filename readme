

# Commander Backend

Commander Backend is a lightweight, command-driven snippet generator built with Node.js, Express, and MongoDB. It lets you map specific command inputs (like `/hi1`) to predefined text responses, making it ideal for support teams, automation, or rapid response scenarios.

## Features

- **Command Recognition:**  
  Detects commands (e.g., `/hi1`) and returns corresponding text snippets.

- **Snippet Mapping:**  
  Associates simple commands to custom text responses. Commands and their outputs are stored for quick lookup and management.

- **REST API:**  
  Provides endpoints to create, read, update, and delete command-snippet mappings.

- **Extensible & Simple:**  
  Minimal setup, easy to extend. Configurations (such as loading commands from files or databases) are supported.

## Directory Structure

```
backend/
├── .gitignore
├── api.http             # Example HTTP requests for testing the API
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Dependency lock file
├── readme.md
└── src/
    ├── local-server.js  # Local Express server entry point
    └── mongo-db.js      # Main server with MongoDB connectivity
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (latest LTS recommended)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JDXE22/commander_backend.git
   cd commander_backend/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in `backend/` if needed, with MongoDB connection details and other configs.

### Running the Server

- **Development mode (with automatic reload):**
  ```bash
  npm run local
  ```

- **Production mode:**
  ```bash
  npm start
  ```

The server typically runs on `http://localhost:3000`.

## API Endpoints

Example endpoints (see `api.http` for ready-made requests):

- **Get all commands:**  
  `GET /command/cmd?page=1&limit=5`

- **Get command by name:**  
  `GET /command/cmd/:command`

- **Get command by ID:**  
  `GET /command/:id`

- **Create a new command:**  
  `POST /command`  
  ```json
  {
    "name": "example",
    "command": "/example",
    "text": "Your predefined response"
  }
  ```

- **Update a command:**  
  `PATCH /command/:id`

- **Delete a command:**  
  `DELETE /command/:id`

## Example Usage

You can use a tool like [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) for VS Code or Postman to try out the requests in `api.http`.

## Technologies Used

- Node.js
- Express
- MongoDB & Mongoose
- dotenv, cors

## Contributing

Feel free to fork the repo and submit pull requests. For major changes, please open an issue first to discuss what you’d like to change.

## License

[ISC](LICENSE)

---

---

Let me know if you want to include more details (like configuration, deployment, or advanced usage)!
