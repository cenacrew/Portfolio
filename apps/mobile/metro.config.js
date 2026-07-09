// Metro config tuned for this pnpm monorepo.
//
// Two friction points, handled up front:
//  1. Metro must WATCH the workspace root so changes in packages/shared are
//     picked up, and it must be able to RESOLVE modules from both the app's
//     own node_modules and the workspace root node_modules.
//  2. pnpm installs dependencies as symlinks into an isolated store
//     (node_modules/.pnpm). Metro follows symlinks by default in this version,
//     but hierarchical lookup must stay enabled so a package's transitive deps
//     resolve through the store. We keep the default node-linker (isolated) on
//     purpose: web (React 19.2.4) and mobile (React 19.2.3) each keep their own
//     React copy, which a hoisted linker would collide.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo (so packages/shared edits trigger reloads).
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app first, then fall back to the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Keep hierarchical lookup so pnpm's symlinked transitive deps resolve.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
