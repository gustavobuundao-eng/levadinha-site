const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { port, publicDir } = require("./config");
const {
  now,
  readDb,
  writeDb,
  generateId,
  generateAccountNumber,
  normalizeUsername,
  seedPremiumUser,
  createRecord,
  updateRecord,
  deleteRecord
} = require("./db");
const { hashPassword, verifyPassword, signToken, verifyToken, publicUser } = require("./utils/security");

seedPremiumUser();

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  send(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
  });
}

function getToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getAuthUser(req) {
  const token = getToken(req);
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = readDb();
  return db.users.find((user) => user.id === payload.sub) || null;
}

function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) sendError(res, 401, "Autenticacao obrigatoria.");
  return user;
}

function requirePremium(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "premium") {
    sendError(res, 403, "Apenas a conta premium pode acessar.");
    return null;
  }
  return user;
}

function route(method, pathname, pattern) {
  if (method !== pattern.method) return null;
  const match = pathname.match(pattern.regex);
  return match ? match.groups || {} : null;
}

async function handleApi(req, res, pathname) {
  if (req.method === "OPTIONS") return send(res, 204, {});

  let params;

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/auth\/register$/ });
  if (params) {
    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return sendError(res, 400, "Usuario e senha sao obrigatorios.");

    const db = readDb();
    const id = normalizeUsername(username);
    if (db.users.some((user) => user.id === id)) return sendError(res, 409, "Usuario ja existe.");

    const user = {
      id,
      accountNumber: generateAccountNumber(db),
      username,
      passwordHash: hashPassword(password),
      role: "base",
      accountType: "Conta base",
      bio: "",
      avatar: "",
      createdAt: now(),
      updatedAt: now()
    };
    db.users.push(user);
    writeDb(db);
    return send(res, 201, { user: publicUser(user) });
  }

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/auth\/login$/ });
  if (params) {
    const body = await readBody(req);
    const db = readDb();
    const id = normalizeUsername(body.username);
    const user = db.users.find((item) => item.id === id);
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return sendError(res, 401, "Usuario ou senha incorretos.");
    }
    const token = signToken({ sub: user.id, role: user.role });
    return send(res, 200, { token, user: publicUser(user) });
  }

  params = route(req.method, pathname, { method: "GET", regex: /^\/api\/auth\/me$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    return send(res, 200, { user: publicUser(user) });
  }

  params = route(req.method, pathname, { method: "PATCH", regex: /^\/api\/users\/me$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const allowed = {};
    ["bio", "avatar", "profileFont", "profileGlow", "profileSparkle"].forEach((key) => {
      if (key in body) allowed[key] = body[key];
    });
    const updated = updateRecord("users", user.id, allowed);
    return send(res, 200, { user: publicUser(updated) });
  }

  params = route(req.method, pathname, { method: "GET", regex: /^\/api\/admin\/users$/ });
  if (params) {
    if (!requirePremium(req, res)) return;
    const db = readDb();
    return send(res, 200, { users: db.users.map(publicUser) });
  }

  params = route(req.method, pathname, { method: "GET", regex: /^\/api\/site\/settings$/ });
  if (params) {
    const db = readDb();
    return send(res, 200, { settings: db.settings?.site || {} });
  }

  params = route(req.method, pathname, { method: "PATCH", regex: /^\/api\/admin\/site\/settings$/ });
  if (params) {
    if (!requirePremium(req, res)) return;
    const body = await readBody(req);
    const db = readDb();
    db.settings = db.settings || {};
    db.settings.site = { ...(db.settings.site || {}), ...(body.settings || {}) };
    db.settings.updatedAt = now();
    writeDb(db);
    return send(res, 200, { settings: db.settings.site });
  }

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/cases$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const item = createRecord("cases", {
      userId: user.id,
      clientNick: body.clientNick,
      contact: body.contact || "",
      accused: body.accused || "",
      date: body.date || "",
      room: body.room || "",
      category: body.category || "Outro",
      description: body.description,
      evidence: Array.isArray(body.evidence) ? body.evidence.slice(0, 5) : [],
      private: true
    });
    return send(res, 201, { case: item });
  }

  params = route(req.method, pathname, { method: "GET", regex: /^\/api\/admin\/cases$/ });
  if (params) {
    if (!requirePremium(req, res)) return;
    return send(res, 200, { cases: readDb().cases });
  }

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/denunciations$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const item = createRecord("denunciations", {
      userId: user.id,
      visibility: body.visibility || "anonima",
      author: body.visibility === "publica" ? body.author || user.username : "",
      target: body.target,
      category: body.category || "Outro",
      summary: body.summary,
      proof: body.proof || "",
      status: "pending"
    });
    return send(res, 201, { denunciation: item });
  }

  params = route(req.method, pathname, { method: "GET", regex: /^\/api\/posts$/ });
  if (params) {
    return send(res, 200, { posts: readDb().posts.filter((post) => post.status !== "hidden") });
  }

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/posts$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const post = createRecord("posts", {
      authorId: user.id,
      author: user.username,
      category: body.category || "Geral",
      content: body.content,
      status: "published",
      replies: []
    });
    return send(res, 201, { post });
  }

  params = route(req.method, pathname, { method: "POST", regex: /^\/api\/posts\/(?<id>[^/]+)\/replies$/ });
  if (params) {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const db = readDb();
    const post = db.posts.find((item) => item.id === params.id);
    if (!post) return sendError(res, 404, "Post nao encontrado.");
    post.replies = post.replies || [];
    post.replies.push({
      id: generateId(),
      authorId: user.id,
      author: user.username,
      content: body.content,
      createdAt: now()
    });
    writeDb(db);
    return send(res, 201, { post });
  }

  return sendError(res, 404, "Rota nao encontrada.");
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const routeMap = {
    "/": "/index.html",
    "/inicio": "/index.html",
    "/pagina-principal": "/index.html",
    "/index": "/index.html",
    "/galeria": "/galeria.html",
    "/denuncias": "/galeria.html",
    "/conta": "/conta.html",
    "/login": "/login.html",
    "/painel": "/painel.html"
  };
  if (cleanPath === "/index.html") {
    res.writeHead(301, { Location: "/pagina-principal" });
    return res.end();
  }
  const safePath = routeMap[cleanPath] || pathname;
  const filePath = path.resolve(publicDir, `.${safePath}`);
  if (!filePath.startsWith(`${publicDir}${path.sep}`) && filePath !== publicDir) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      const wantsHtml = req.headers.accept?.includes("text/html") || path.extname(filePath) === ".html" || !path.extname(filePath);
      const fallbackPath = path.join(publicDir, "index.html");
      if (wantsHtml && filePath !== fallbackPath && fs.existsSync(fallbackPath)) {
        return fs.readFile(fallbackPath, (fallbackError, fallbackData) => {
          if (fallbackError) {
            res.writeHead(404);
            return res.end("Not found");
          }
          return sendStaticData(req, res, fallbackPath, fallbackData);
        });
      }
      res.writeHead(404);
      return res.end("Not found");
    }
    return sendStaticData(req, res, filePath, data);
  });
}

function sendStaticData(req, res, filePath, data) {
  const ext = path.extname(filePath);
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml; charset=utf-8"
  }[ext] || "application/octet-stream";
  const cacheControl = ext === ".html"
    ? "no-cache"
    : [".css", ".js"].includes(ext)
      ? "public, max-age=300"
      : "public, max-age=604800, immutable";
  const headers = {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "Vary": "Accept-Encoding"
  };
  const acceptsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  const canCompress = [".html", ".css", ".js", ".json", ".svg"].includes(ext);
  if (acceptsGzip && canCompress && data.length > 1024) {
    zlib.gzip(data, { level: 6 }, (zipError, zipped) => {
      if (zipError) {
        res.writeHead(200, headers);
        return res.end(data);
      }
      res.writeHead(200, { ...headers, "Content-Encoding": "gzip" });
      return res.end(zipped);
    });
    return;
  }
  res.writeHead(200, headers);
  return res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url.pathname);
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    return sendError(res, 500, error.message || "Erro interno.");
  }
});

server.listen(port, () => {
  console.log(`Levadinha backend rodando em http://localhost:${port}`);
  console.log(`Arquivos publicos em ${publicDir}`);
});
