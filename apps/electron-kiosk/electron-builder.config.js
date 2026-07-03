/**
 * electron-builder configuration for DisplayGrid Kiosk app.
 *
 * Before building, run:
 *   pnpm --filter @displaygrid/display-client build
 *
 * The built display-client (apps/display-client/dist/) is bundled as
 * extra resources under "renderer/".
 */

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'io.displaygrid.kiosk',
  productName: 'DisplayGrid Kiosk',
  copyright: 'Copyright © 2024 JoeMighty',
  publish: null,

  // node-linker=hoisted puts electron in the monorepo root node_modules, where
  // electron-builder's own lookup (appDir/node_modules/electron) can't see it.
  // Resolve the installed version via Node resolution, which walks up to root.
  electronVersion: require('electron/package.json').version,

  directories: {
    output: path.join(ROOT, 'dist/electron-kiosk'),
    buildResources: path.join(__dirname, 'build-resources'),
  },

  // Bundle the built Vite display-client as renderer resources
  extraResources: [
    {
      from: path.join(ROOT, 'apps/display-client/dist'),
      to: 'renderer',
      filter: ['**/*'],
    },
  ],

  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    artifactName: 'DisplayGrid-Kiosk-Setup.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
  },

  mac: {
    target: [{ target: 'dmg', arch: ['universal'] }],
    artifactName: 'DisplayGrid-Kiosk.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
    category: 'public.app-category.utilities',
  },

  linux: {
    executableName: 'displaygrid-kiosk',
    maintainer: 'JoeMighty <noreply@displaygrid.io>',
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb',      arch: ['x64'] },
    ],
    artifactName: 'DisplayGrid-Kiosk-${arch}.${ext}',
    icon: path.join(__dirname, 'build-resources/icon.png'),
    category: 'Utility',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    runAfterFinish: true,
  },
};
