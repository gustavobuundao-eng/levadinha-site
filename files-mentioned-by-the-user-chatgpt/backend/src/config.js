const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  premiumUsername: process.env.PREMIUM_USERNAME || "Levadinha",
  premiumPassword: process.env.PREMIUM_PASSWORD || "levadinha",
  dbPath: path.join(__dirname, "data", "database.json"),
  publicDir: rootDir
};
