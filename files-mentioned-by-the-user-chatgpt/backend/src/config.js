const path = require("node:path");
const fs = require("node:fs");

const rootDir = path.resolve(__dirname, "..", "..");

function listPublicDirCandidates() {
  const baseCandidates = [
    process.env.PUBLIC_DIR ? path.resolve(process.cwd(), process.env.PUBLIC_DIR) : "",
    rootDir,
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "..", ".."),
    process.cwd()
  ].filter(Boolean);

  const expanded = new Set();
  baseCandidates.forEach((dir) => {
    let current = path.resolve(dir);
    for (let index = 0; index < 4; index += 1) {
      expanded.add(current);
      try {
        fs.readdirSync(current, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .slice(0, 12)
          .forEach((entry) => expanded.add(path.join(current, entry.name)));
      } catch {
        // Ignore folders Render or the local machine cannot read.
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  });

  return [...expanded];
}

function resolvePublicDir() {
  return listPublicDirCandidates().find((dir) => {
    return fs.existsSync(path.join(dir, "index.html")) && fs.existsSync(path.join(dir, "styles.css"));
  }) || rootDir;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  premiumUsername: process.env.PREMIUM_USERNAME || "Levadinha",
  premiumPassword: process.env.PREMIUM_PASSWORD || "levadinha",
  dbPath: path.join(__dirname, "data", "database.json"),
  publicDir: resolvePublicDir()
};
