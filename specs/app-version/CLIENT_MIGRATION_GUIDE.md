# Client Migration Guide: v1 to v2

**For Frontend & Client Developers**

This guide shows how to update your client code to use the new v2 API.

---

## Overview: What Changed?

### v1 API (Old)

- No user accounts
- No authentication
- All commands visible and shared
- Example: `GET /api/commands`

### v2 API (New)

- User registration and login required
- JWT token-based authentication
- Private commands per user
- Example: `GET /api/v2/commands` + `Authorization: Bearer <token>`

**Key Benefit:** Only YOU can see and modify your own commands. More privacy and better data organization.

---

## Step 1: Register a New Account

### Request

```javascript
fetch('http://localhost:3000/api/v2/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe', // Must be 3+ chars, unique
    email: 'john@example.com', // Must be unique
    password: 'SecurePass123!', // Must be 8+ chars
  }),
});
```

### Response (201 Created)

```json
{
  "_id": "507f191e810c19729de860ea",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMTkxZTgxMGMxOTcyOWRlODYwZWEiLCJ1c2VybmFtZSI6ImpvaG5fZG9lIiwiaWF0IjoxNzEwNzAwODAwLCJleHAiOjE3MTEzMDU2MDB9..."
}
```

### What to do with the token:

**Save it** in localStorage or sessionStorage:

```javascript
localStorage.setItem('authToken', response.token);
```

---

## Step 2: Login

### Request

```javascript
fetch('http://localhost:3000/api/v2/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'SecurePass123!',
  }),
});
```

### Response (200 OK)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "507f191e810c19729de860ea",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### Save the token:

```javascript
const data = await response.json();
localStorage.setItem('authToken', data.token);
```

---

## Step 3: Use the Token for All API Calls

**⭐ CRITICAL:** Include the token in the `Authorization` header for every v2 API call.

### Include in Header

```javascript
const token = localStorage.getItem('authToken');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`, // ⭐ THIS IS REQUIRED
};

fetch('http://localhost:3000/api/v2/commands', {
  method: 'GET',
  headers: headers,
});
```

### Helper Function (Recommended)

```javascript
// Create a reusable function
const apiCall = async (method, endpoint, body = null) => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    throw new Error('Not logged in. Please login first.');
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    `http://localhost:3000/api/v2${endpoint}`,
    options,
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};

// Usage:
const commands = await apiCall('GET', '/commands');
```

---

## API Endpoint Comparison

### LIST COMMANDS

**v1 (Old)**

```javascript
fetch('/api/commands').then((r) => r.json());
```

**v2 (New)**

```javascript
const headers = {
  Authorization: `Bearer ${token}`,
};

fetch('/api/v2/commands', { headers }).then((r) => r.json());
```

**Response Changes:**

- v1: Array of all commands
- v2: Only your commands, wrapped in object with pagination

```json
{
  "commands": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f191e810c19729de860ea", // ⭐ NEW: shows owner
      "name": "Hello",
      "command": "/hello",
      "text": "Hello, world!",
      "createdAt": "2026-03-17T10:00:00Z", // ⭐ NEW: timestamp
      "updatedAt": "2026-03-17T10:00:00Z" // ⭐ NEW: timestamp
    }
  ],
  "totalPages": 1,
  "currentPage": 1
}
```

---

### SEARCH BY TRIGGER

**v1 (Old)**

```javascript
fetch('/api/commands?trigger=%2Fhello').then((r) => r.json());
```

**v2 (New)**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands?trigger=%2Fhello', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
```

**Response Changes:**

- v1: Returns the command object directly
- v2: Returns command from your library only (404 if not found or not owned)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!",
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T10:00:00Z"
}
```

---

### CREATE COMMAND

**v1 (Old)**

```javascript
fetch('/api/commands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Hello',
    command: '/hello',
    text: 'Hello, world!',
  }),
});
```

**v2 (New)**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: 'Hello',
    command: '/hello',
    text: 'Hello, world!',
    // ⭐ NO userId field! It's set automatically from your JWT
  }),
});
```

**Key Change:** Don't send `userId`. Server automatically associates with your account.

---

### GET SINGLE COMMAND

**v1 (Old)**

```javascript
fetch('/api/commands/507f1f77bcf86cd799439011').then((r) => r.json());
```

**v2 (New)**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands/507f1f77bcf86cd799439011', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
```

**Possible Responses:**

- `200`: Command found and you own it
- `403 Forbidden`: Command exists but belongs to another user
- `404 Not Found`: Command doesn't exist or you don't own it

---

### UPDATE COMMAND

**v1 (Old)**

```javascript
fetch('/api/commands/507f1f77bcf86cd799439011', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Updated response!',
  }),
});
```

**v2 (New)**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands/507f1f77bcf86cd799439011', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: 'Updated response!',
    // Only send fields you want to change
  }),
});
```

**Possible Responses:**

- `200`: Updated successfully
- `403 Forbidden`: Not your command
- `404 Not Found`: Command doesn't exist

---

### DELETE COMMAND

**v1 (Old)**

```javascript
fetch('/api/commands/507f1f77bcf86cd799439011', {
  method: 'DELETE',
});
```

**v2 (New)**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands/507f1f77bcf86cd799439011', {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

**Possible Responses:**

- `204 No Content`: Deleted successfully
- `403 Forbidden`: Not your command
- `404 Not Found`: Command doesn't exist

---

## Complete React Example

### Using Hooks + Context

```javascript
// authContext.js
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Register
  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      setToken(data.token);
      setUser(data);
      localStorage.setItem('authToken', data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

```javascript
// commandsHook.js
import { useContext, useState } from 'react';
import { AuthContext } from './authContext';

export const useCommands = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (method, endpoint, body = null) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`http://localhost:3000/api/v2${endpoint}`, options);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'API Error');
    }

    return res.json();
  };

  // List all commands
  const listCommands = async () => {
    setLoading(true);
    setError(null);
    try {
      return await apiCall('GET', '/commands');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create command
  const createCommand = async (name, command, text) => {
    setLoading(true);
    setError(null);
    try {
      return await apiCall('POST', '/commands', { name, command, text });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update command
  const updateCommand = async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      return await apiCall('PATCH', `/commands/${id}`, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete command
  const deleteCommand = async (id) => {
    setLoading(true);
    setError(null);
    try {
      return await apiCall('DELETE', `/commands/${id}`);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    listCommands,
    createCommand,
    updateCommand,
    deleteCommand,
    loading,
    error,
  };
};
```

```javascript
// CommandList.jsx
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from './authContext';
import { useCommands } from './commandsHook';

export const CommandList = () => {
  const { user } = useContext(AuthContext);
  const { listCommands, createCommand, deleteCommand, loading, error } =
    useCommands();
  const [commands, setCommands] = useState([]);

  useEffect(() => {
    if (user && user.userId) {
      loadCommands();
    }
  }, [user]);

  const loadCommands = async () => {
    try {
      const data = await listCommands();
      setCommands(data.commands);
    } catch (err) {
      console.error('Failed to load commands:', err);
    }
  };

  const handleCreate = async () => {
    try {
      await createCommand('New Command', '/new', 'Response text');
      loadCommands();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCommand(id);
      loadCommands();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (!user) return <div>Please login first</div>;
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Commands ({commands.length})</h2>
      <button onClick={handleCreate}>Create New Command</button>

      <ul>
        {commands.map((cmd) => (
          <li key={cmd._id}>
            <strong>{cmd.command}</strong>: {cmd.text}
            <button onClick={() => handleDelete(cmd._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## Error Handling

### Common Errors and Solutions

| Error                          | Status | Cause                      | Solution                                |
| ------------------------------ | ------ | -------------------------- | --------------------------------------- |
| "Missing authorization header" | 401    | No token in header         | Login first, add `Authorization` header |
| "Invalid token"                | 401    | Token is expired           | Login again to get new token            |
| "Not authorized"               | 403    | You don't own this command | Check command ID is correct             |
| "Command not found"            | 404    | Command doesn't exist      | Verify ID matches your command          |
| "Username already exists"      | 409    | Username taken             | Choose different username               |
| "Invalid username or password" | 401    | Wrong credentials          | Check spelling                          |

### Handle Expired Tokens

```javascript
const apiCall = async (method, endpoint, body = null) => {
  let token = localStorage.getItem('authToken');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let response = await fetch(`/api/v2${endpoint}`, options);

  // If 401, try to refresh token (if implemented)
  if (response.status === 401) {
    // For now, logout the user
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  return response.json();
};
```

---

## Development Checklist

Before deploying your updated client:

- [ ] Updated all `/api/commands` paths to `/api/v2/commands`
- [ ] Added `Authorization: Bearer <token>` header to all v2 calls
- [ ] Implemented login/register UI
- [ ] Store JWT token in localStorage
- [ ] Handle 401 errors (expired token) with re-login
- [ ] Handle 403 errors (permission denied) gracefully
- [ ] Remove userId from request bodies (it's set auto-matically)
- [ ] Tested both register and login flows
- [ ] Tested creating/updating/deleting commands
- [ ] Verified commands are private to logged-in user
- [ ] Tested error cases (wrong password, duplicate username, etc.)

---

## FAQ

**Q: Do I have to update my client?**  
A: Only if you want to use v2. v1 still works without authentication (for now).

**Q: How long is the JWT token valid?**  
A: 7 days by default. After that, login again.

**Q: Can I see other users' commands?**  
A: No, v2 API only returns your own commands. This is enforced on the server.

**Q: What if I lose my token?**  
A: Login again to get a new one.

**Q: Can I update another user's command?**  
A: No, you'll get a 403 Forbidden error.

**Q: What's the difference between 403 and 404?**  
A: 403 = command exists but you can't access it. 404 = command doesn't exist (for you).

**Q: Do I need HTTPS?**  
A: Recommended in production! Don't send tokens over unencrypted HTTP.

**Q: How do I logout?**  
A: Delete the token from localStorage. You'll need to login again to get a new token.

---

## Summary

**Old Way (v1):**

```javascript
fetch('/api/commands')
  .then((r) => r.json())
  .then((data) => console.log(data));
```

**New Way (v2):**

```javascript
const token = localStorage.getItem('authToken');
fetch('/api/v2/commands', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => console.log(data));
```

**That's it!** The main change is adding the `Authorization` header with your JWT token.

---

**Questions?** Ask the backend team or check the SDD_v2.md for more details.
