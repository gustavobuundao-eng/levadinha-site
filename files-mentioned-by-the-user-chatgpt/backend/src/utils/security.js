const crypto = require("node:crypto");
const { jwtSecret } = require("../config");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expected] = stored.split(":");
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
  const unsigned = `${base64url(header)}.${base64url(body)}`;
  const signature = crypto.createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = crypto.createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    accountNumber: user.accountNumber,
    username: user.username,
    bio: user.bio || "",
    avatar: user.avatar || "",
    role: user.role,
    createdAt: user.createdAt
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  publicUser
};
