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

  directories: {
    output: path.join(ROOT, 'dist/electron-server'),
    buildResources: path.join(__dirname, 'build-resources'),
  },

  // Bundle the Next.js standalone build + ws-server as extra resources
  extraResources: [
    {
      from: path.join(ROOT, 'apps/dashboard/.next/standalone'),
      to: '.',
      filter: ['**/*'],
    },
    {
      from: path.join(ROOT, 'apps/dashboard/ws-server.js'),
      to: 'ws-server.js',
    },
    {
      from: path.join(ROOT, 'apps/dashboard/.next/static'),
      to: '.next/static',
      filter: ['**/*'],
    },
    {
      from: path.join(ROOT, 'apps/dashboard/public'),
      to: 'public',
      filter: ['**/*'],
    },
  ],

  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    artifactName: 'DisplayGrid-Server-Setup.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.ico'),
  },

  mac: {
    target: [{ target: 'dmg', arch: ['universal'] }],
    artifactName: 'DisplayGrid-Server.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.icns'),
    category: 'public.app-category.utilities',
  },

  linux: {
    executableName: 'displaygrid-server',
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
