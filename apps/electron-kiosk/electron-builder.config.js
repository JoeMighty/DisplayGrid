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
  // Update metadata (kiosk.yml / kiosk-linux.yml) for electron-updater.
  // Channel is per-app because both apps share one GitHub release, where
  // the default latest.yml names would collide. CI still uploads release
  // assets itself (--publish never); this config only drives metadata
  // generation. mac overrides publish to null below: the unsigned dmg-only
  // build can neither auto-update nor generate update info (needs zip).
  publish: { provider: 'github', owner: 'JoeMighty', repo: 'DisplayGrid', channel: 'kiosk' },

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
    // No auto-update on mac: unsigned builds can't self-update, and update
    // info generation requires a zip target the dmg-only build lacks.
    publish: null,
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
