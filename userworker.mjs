let kv = null; // Deno Kv 实例
let users = []; // 用户数据数组
let sessions = new Map(); // 内存中的会话存储 (token -> user info)

// --- Utility Classes and Functions ---

/**
 * HttpError class for consistent error handling.
 */
class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype);
    this.status = status;
  }
}

/**
 * Applies CORS headers to ResponseInit options.
 * @param {ResponseInit} [responseOptions={}] - Optional ResponseInit object to modify.
 * @returns {ResponseInit} ResponseInit with CORS headers.
 */
const fixCors = (responseOptions = {}) => {
  const headers = new Headers(responseOptions.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  responseOptions.headers = headers;
  return responseOptions;
};

/**
 * Handles OPTIONS requests for CORS preflight.
 * @returns {Response} A Response for a preflight request.
 */
const handleOPTIONS = () => {
  return new Response(null, fixCors({ status: 204 }));
};

// --- Password Hashing Functions ---

/**
 * Hash a password using Web Crypto API (PBKDF2)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Store salt and hash together
  const hashArray = Array.from(new Uint8Array(key));
  const saltArray = Array.from(salt);
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash (format: salt:hash)
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  try {
    // Check if it's a bcrypt hash (starts with $2b$)
    if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
      // For bcrypt hashes, we'll use a simple comparison for now
      // In production, you should use a bcrypt library
      // For now, we'll assume old bcrypt hashes need to be migrated
      console.warn('BCrypt hash detected. Consider migrating to new hash format.');
      // For demo purposes, we'll skip verification of bcrypt hashes
      // In production, use: import { compare } from "https://deno.land/x/bcrypt/mod.ts";
      return false; // Require password reset for old hashes
    }
    
    const [saltHex, hashHex] = hash.split(':');
    if (!saltHex || !hashHex) return false;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const salt = Uint8Array.from(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const key = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(key));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return computedHash === hashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 * @returns {string} Random token
 */
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get user from Authorization header
 * @param {Request} request - The request object
 * @returns {Promise<Object|null>} User object or null
 */
async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  
  // Check if session is expired (24 hours)
  const now = Date.now();
  if (now - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    await saveSessions();
    return null;
  }
  
  return session.user;
}

// --- Deno KV Operations ---

/**
 * Initializes the Deno KV store. Should be called once.
 */
async function initializeKv() {
    if (!kv) {
        try {
            kv = await Deno.openKv();
            console.log('[INFO] Deno KV store initialized.');
        } catch (error) {
            console.error('[CRITICAL] Failed to initialize Deno KV store:', error);
            throw new HttpError("Failed to initialize KV store.", 500);
        }
    }
}

/**
 * Loads user data from Deno KV.
 */
async function loadUsers() {
    if (!kv) await initializeKv();
    try {
        const result = await kv.get(["users_data"]);
        if (result.value) {
            users = JSON.parse(result.value);
            console.log(`[INFO] Users loaded from KV. Total users: ${users.length}`);
        } else {
            console.warn('[WARN] No user data found in KV, initializing with empty user list.');
            users = JSON.parse(Deno.env.get('users_data') || '[]');
            if (users.length === 0) {
                // Initialize with default admin user if no users exist
                users = [];
            }
        }
    } catch (err) {
        console.error('Error loading users from KV:', err);
        throw new HttpError("Failed to load user data from KV.", 500);
    }
}

/**
 * Saves current user data to Deno KV.
 */
async function saveUsers() {
    if (!kv) await initializeKv();
    try {
        await kv.set(["users_data"], JSON.stringify(users, null, 2));
        console.log('[INFO] Users saved to KV successfully.');
    } catch (err) {
        console.error('Error saving users to KV:', err);
        throw new HttpError("Failed to save user data to KV.", 500);
    }
}

/**
 * Loads session data from Deno KV.
 */
async function loadSessions() {
    if (!kv) await initializeKv();
    try {
        const result = await kv.get(["sessions_data"]);
        if (result.value) {
            const sessionsData = result.value;
            sessions.clear();
            // Convert array of [token, session] pairs back to Map
            for (const [token, session] of sessionsData) {
                sessions.set(token, session);
            }
            console.log(`[INFO] Sessions loaded from KV. Total sessions: ${sessions.size}`);
        } else {
            console.warn('[WARN] No session data found in KV, initializing with empty sessions.');
            sessions.clear();
        }
    } catch (err) {
        console.error('Error loading sessions from KV:', err);
        throw new HttpError("Failed to load session data from KV.", 500);
    }
}

/**
 * Saves current session data to Deno KV.
 */
async function saveSessions() {
    if (!kv) await initializeKv();
    try {
        // Convert Map to array of [token, session] pairs for JSON serialization
        const sessionsData = Array.from(sessions.entries());
        await kv.set(["sessions_data"], sessionsData);
        console.log('[INFO] Sessions saved to KV successfully.');
    } catch (err) {
        console.error('Error saving sessions to KV:', err);
        throw new HttpError("Failed to save session data to KV.", 500);
    }
}

// 模块初始化时尝试初始化 KV 并加载数据。
(async () => {
    try {
        await initializeKv();
        await loadUsers();
        await loadSessions();
    } catch (e) {
        console.error("[CRITICAL] Initial KV setup or data load failed:", e.message);
    }
})();

export default {
  /**
   * Main fetch handler for all incoming requests.
   * @param {Request} request - The incoming Request object.
   * @returns {Promise<Response>} A Promise that resolves to a Response object.
   */
  async fetch(request) {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleOPTIONS();
    }

    // 统一错误处理函数
    const errHandler = (err) => {
      console.error("[ERROR]", err);
      const status = (err instanceof HttpError) ? err.status : 500;
      const message = err.message || "Internal Server Error";
      return new Response(JSON.stringify({ error: message }), fixCors({ 
        status: status, 
        headers: { 'Content-Type': 'application/json' } 
      }));
    };

    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // 在每个请求中重新加载数据，以确保数据是最新的
      await loadUsers();

      // 根据请求方法和路径进行路由
      switch (true) {
        // --- POST Endpoints ---
        
        // User Registration
        case request.method === "POST" && pathname === "/register":
          const registerData = await request.json();
          const { username, email, password, phone_number } = registerData;

          // Validation
          if (!username || !email || !password) {
            throw new HttpError("Missing required fields: username, email, password", 400);
          }

          // Check if user already exists
          const existingUser = users.find(u => u.username === username || u.email === email);
          if (existingUser) {
            throw new HttpError("User with this username or email already exists", 409);
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            throw new HttpError("Invalid email format", 400);
          }

          // Validate password strength
          if (password.length < 6) {
            throw new HttpError("Password must be at least 6 characters long", 400);
          }

          // Hash password
          const passwordHash = await hashPassword(password);

          // Generate user ID
          const userId = `uuid-${username}-${Date.now()}`;

          // Create new user
          const newUser = {
            id: userId,
            username: username,
            private_videos_path: `/plain/${username}`,
            email: email,
            password_hash: passwordHash,
            phone_number: phone_number || null,
            roles: ["user"],
            status: "active",
            balance: 0.00,
            created_at: new Date().toISOString(),
            last_login_at: null,
            last_login_location: null,
            profile: {
              first_name: "",
              last_name: "",
              avatar_url: null,
              language: "en-US",
              contact_address: null
            },
            invited_users: [],
            approved_users: []
          };

          users.push(newUser);
          await saveUsers();

          // Return user data without password hash
          const { password_hash, ...userResponse } = newUser;
          return new Response(
            JSON.stringify({ 
              message: "User registered successfully", 
              user: userResponse 
            }), 
            fixCors({ 
              status: 201, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // User Sign In
        case request.method === "POST" && pathname === "/signin":
        case request.method === "POST" && pathname === "/login":
          const loginData = await request.json();
          const { username: loginUsername, email: loginEmail, password: loginPassword } = loginData;

          if (!loginPassword || (!loginUsername && !loginEmail)) {
            throw new HttpError("Missing required fields: username/email and password", 400);
          }

          // Find user by username or email
          const user = users.find(u => 
            (loginUsername && u.username === loginUsername) || 
            (loginEmail && u.email === loginEmail)
          );

          if (!user) {
            throw new HttpError("Invalid username/email or password", 401);
          }

          // Check if user is active
          if (user.status !== "active") {
            throw new HttpError("User account is not active", 403);
          }

          // Verify password
          const isValidPassword = await verifyPassword(loginPassword, user.password_hash);
          if (!isValidPassword) {
            throw new HttpError("Invalid username/email or password", 401);
          }

          // Generate token
          const token = generateToken();
          
          // Get client IP and location (simplified)
          const clientIp = request.headers.get("CF-Connecting-IP") || 
                          request.headers.get("X-Forwarded-For") || 
                          "unknown";

          // Update last login info
          user.last_login_at = new Date().toISOString();
          user.last_login_location = {
            ip_address: clientIp,
            country: "Unknown",
            city: "Unknown",
            latitude: null,
            longitude: null
          };

          await saveUsers();

          // Store session
          sessions.set(token, {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              roles: user.roles,
              status: user.status
            },
            createdAt: Date.now()
          });
          await saveSessions();

          // Return token and user info
          const { password_hash: _, ...userInfo } = user;
          return new Response(
            JSON.stringify({ 
              message: "Sign in successful",
              token: token,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles,
                status: user.status,
                profile: user.profile
              }
            }), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // User Sign Out
        case request.method === "POST" && pathname === "/signout":
        case request.method === "POST" && pathname === "/logout":
          const authHeader = request.headers.get("Authorization");
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            sessions.delete(token);
            await saveSessions();
          }
          return new Response(
            JSON.stringify({ message: "Sign out successful" }), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // Get Current User (Authorization required)
        case request.method === "GET" && pathname === "/me":
        case request.method === "GET" && pathname === "/user/me":
          const currentUser = await getAuthenticatedUser(request);
          if (!currentUser) {
            throw new HttpError("Unauthorized", 401);
          }

          // Get full user data
          const fullUser = users.find(u => u.id === currentUser.id);
          if (!fullUser) {
            throw new HttpError("User not found", 404);
          }

          const { password_hash: __, ...userData } = fullUser;
          return new Response(
            JSON.stringify(userData), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // Get All Users (Admin only)
        case request.method === "GET" && pathname === "/users":
          const adminUser = await getAuthenticatedUser(request);
          if (!adminUser) {
            throw new HttpError("Unauthorized", 401);
          }
          if (!adminUser.roles.includes("admin")) {
            throw new HttpError("Forbidden: Admin access required", 403);
          }

          // Return users without password hashes
          const usersList = users.map(u => {
            const { password_hash: ___, ...userWithoutPassword } = u;
            return userWithoutPassword;
          });

          return new Response(
            JSON.stringify(usersList), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // Update User Profile (Authorization required)
        case request.method === "PUT" && pathname === "/user/profile":
          const profileUser = await getAuthenticatedUser(request);
          if (!profileUser) {
            throw new HttpError("Unauthorized", 401);
          }

          const profileData = await request.json();
          const userToUpdate = users.find(u => u.id === profileUser.id);
          if (!userToUpdate) {
            throw new HttpError("User not found", 404);
          }

          // Update profile fields
          if (profileData.profile) {
            userToUpdate.profile = { ...userToUpdate.profile, ...profileData.profile };
          }
          if (profileData.phone_number !== undefined) {
            userToUpdate.phone_number = profileData.phone_number;
          }

          await saveUsers();

          const { password_hash: ____, ...updatedUser } = userToUpdate;
          return new Response(
            JSON.stringify({ 
              message: "Profile updated successfully", 
              user: updatedUser 
            }), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        // Change Password (Authorization required)
        case request.method === "POST" && pathname === "/user/change-password":
          const passwordUser = await getAuthenticatedUser(request);
          if (!passwordUser) {
            throw new HttpError("Unauthorized", 401);
          }

          const { old_password, new_password } = await request.json();
          if (!old_password || !new_password) {
            throw new HttpError("Missing required fields: old_password, new_password", 400);
          }

          if (new_password.length < 6) {
            throw new HttpError("New password must be at least 6 characters long", 400);
          }

          const userForPassword = users.find(u => u.id === passwordUser.id);
          if (!userForPassword) {
            throw new HttpError("User not found", 404);
          }

          const isOldPasswordValid = await verifyPassword(old_password, userForPassword.password_hash);
          if (!isOldPasswordValid) {
            throw new HttpError("Invalid old password", 401);
          }

          userForPassword.password_hash = await hashPassword(new_password);
          await saveUsers();

          return new Response(
            JSON.stringify({ message: "Password changed successfully" }), 
            fixCors({ 
              status: 200, 
              headers: { 'Content-Type': 'application/json' } 
            })
          );

        default:
          throw new HttpError("404 Not Found", 404);
      }
    } catch (err) {
      return errHandler(err);
    }
  }
};
