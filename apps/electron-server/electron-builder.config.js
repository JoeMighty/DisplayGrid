/**
 * electron-builder configuration for DisplayGrid Server app.
 *
 * Before building, run:
 *   pnpm --filter @displaygrid/dashboard build
 *
 * The standalone Next.js output (apps/dashboard/.next/standalone/) and
 * ws-server.js are copied into the installer as extra resources.
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'io.displaygrid.server',
  productName: 'DisplayGrid Server',
  copyright: 'Copyright © 2024 JoeMighty',
  publish: null,

  // node-linker=hoisted puts electron in the monorepo root node_modules, where
  // electron-builder's own lookup (appDir/node_modules/electron) can't see it.
  // Resolve the installed version via Node resolution, which walks up to root.
  electronVersion: require('electron/package.json').version,

  directories: {
    output: path.join(ROOT, 'dist/electron-server'),
    buildResources: path.join(__dirname, 'build-resources'),
  },

  // The standalone directory already contains everything needed:
  // - apps/dashboard/server.js       (Next.js server entry)
  // - apps/dashboard/.next/static/   (CSS/JS assets)
  // - apps/dashboard/public/         (public assets)
  // - node_modules/                  (all deps, pnpm symlinks dereferenced in CI)
  // - ws-server.js                   (WebSocket server at standalone root)
  extraResources: [
    {
      from: path.join(ROOT, 'apps/dashboard/.next/standalone'),
      to: '.',
      filter: ['**/*'],
    },
    // Drizzle migration SQL — applied to the userData DB on app startup
    // (see electron/main.js runMigrations).
    {
      from: path.join(ROOT, 'packages/db/drizzle'),
      to: 'drizzle',
      filter: ['**/*'],
    },
  ],

  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    artifactName: 'DisplayGrid-Server-Setup.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
  },

  mac: {
    target: [{ target: 'dmg', arch: ['universal'] }],
    artifactName: 'DisplayGrid-Server.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
    category: 'public.app-category.utilities',
    // Our @electron/rebuild step pre-builds better-sqlite3 as a universal
    // (fat) binary.  The same fat binary ends up in both the x64 and arm64
    // temp packages, so @electron/universal sees identical content in both
    // and throws.  x64ArchFiles tells it to accept identical native files
    // (the fat binary is used as-is, which works on both architectures).
    x64ArchFiles: '**/*.node',
  },

  linux: {
    executableName: 'displaygrid-server',
    maintainer: 'JoeMighty <noreply@displaygrid.io>',
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb',      arch: ['x64'] },
    ],
    artifactName: 'DisplayGrid-Server-${arch}.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
    category: 'Utility',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: false,
    createStartMenuShortcut: true,
    runAfterFinish: true,
  },
};
