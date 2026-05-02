const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { dbPath, premiumUsername, premiumPassword } = require("./config");
const { hashPassword } = require("./utils/security");

function now() {
  return new Date().toISOString();
}

function emptyDatabase() {
  return {
    users: [],
    profiles: [],
    cases: [],
    denunciations: [],
    posts: [],
    settings: {}
  };
}

function ensureDatabase() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(emptyDatabase(), null, 2));
  }
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  return db;
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateAccountNumber(db) {
  const used = new Set(db.users.map((user) => user.accountNumber).filter(Boolean));
  let number = "";
  do {
    number = String(Math.floor(1000 + Math.random() * 9000));
  } while (used.has(number));
  return number;
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function seedPremiumUser() {
  const db = readDb();
  const premiumId = normalizeUsername(premiumUsername);
  const existing = db.users.find((user) => user.role === "premium" || user.id === premiumId);

  if (existing) {
    existing.id = premiumId;
    existing.username = premiumUsername;
    existing.role = "premium";
    existing.passwordHash = hashPassword(premiumPassword);
    existing.accountType = "Conta premium";
    writeDb(db);
    return;
  }

  db.users.unshift({
    id: premiumId,
    accountNumber: "0001",
    username: premiumUsername,
    passwordHash: hashPassword(premiumPassword),
    role: "premium",
    accountType: "Conta premium",
    bio: "Conta premium da Levadinha.",
    avatar: "",
    createdAt: now(),
    updatedAt: now()
  });
  writeDb(db);
}

function createRecord(collection, payload) {
  const db = readDb();
  const item = { id: payload.id || generateId(), createdAt: now(), updatedAt: now(), ...payload };
  db[collection].unshift(item);
  writeDb(db);
  return item;
}

function updateRecord(collection, id, patch) {
  const db = readDb();
  const index = db[collection].findIndex((item) => item.id === id);
  if (index < 0) return null;
  db[collection][index] = { ...db[collection][index], ...patch, updatedAt: now() };
  writeDb(db);
  return db[collection][index];
}

function deleteRecord(collection, id) {
  const db = readDb();
  db[collection] = db[collection].filter((item) => item.id !== id);
  writeDb(db);
  return true;
}

module.exports = {
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
};
