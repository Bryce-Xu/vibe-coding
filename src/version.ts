/**
 * Application version information
 * This file is generated at build time to track which commit is deployed
 */

export const APP_VERSION = {
  commit: import.meta.env.VITE_GIT_COMMIT || 'unknown',
  buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
  branch: import.meta.env.VITE_GIT_BRANCH || 'unknown'
};

// Log version info in development
if (import.meta.env.DEV) {
  console.log('📦 App Version:', APP_VERSION);
}

