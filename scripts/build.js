const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const assetsToCopy = [
  "server.js",
  "app",
  "logger.js",
  "swagger.js",
  "package.json",
  "package-lock.json",
  ".env.example",
  "README.md",
];

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const copyFile = (source, destination) => {
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
};

const copyDirectory = (sourceDir, destinationDir) => {
  ensureDir(destinationDir);
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  entries.forEach((entry) => {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, destinationPath);
    }
  });
};

const cleanOutput = () => {
  fs.rmSync(distDir, { recursive: true, force: true });
  ensureDir(distDir);
};

const copyAssets = () => {
  assetsToCopy
    .map((item) => ({
      source: path.join(projectRoot, item),
      destination: path.join(distDir, item),
    }))
    .filter(({ source }) => fs.existsSync(source))
    .forEach(({ source, destination }) => {
      const stats = fs.statSync(source);
      if (stats.isDirectory()) {
        copyDirectory(source, destination);
      } else if (stats.isFile()) {
        copyFile(source, destination);
      }
    });
};

const writeBuildInfo = () => {
  const buildInfoPath = path.join(distDir, "BUILD_INFO.json");
  const buildInfo = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
  };
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
};

const main = () => {
  console.log("Cleaning previous build...");
  cleanOutput();

  console.log("Copying project assets...");
  copyAssets();

  console.log("Writing build metadata...");
  writeBuildInfo();

  console.log(`Build complete. Output available in: ${distDir}`);
};

main();
