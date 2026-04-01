#!/usr/bin/env node

/**
 * Post-sync hook to ensure local plugins are registered in capacitor.plugins.json
 * This runs after `npx cap sync android` to inject the local plugin into the registry.
 */

const fs = require('fs');
const path = require('path');

// Get the project root (parent of scripts directory)
const scriptDir = __dirname;
const projectRoot = path.dirname(scriptDir);

const pluginsJsonPath = path.join(
  projectRoot,
  'android/app/src/main/assets/capacitor.plugins.json'
);

console.log('[post-sync] Plugin JSON path:', pluginsJsonPath);

try {
  const pluginsJson = JSON.parse(fs.readFileSync(pluginsJsonPath, 'utf-8'));
  
  // Check if TcpClient is already registered
  const isTcpClientPresent = pluginsJson.some(p => p.pkg === 'TcpClient');
  const isFolderOpenerPresent = pluginsJson.some(p => p.pkg === 'FolderOpener');
  
  if (!isTcpClientPresent) {
    console.log('[post-sync] Adding TcpClientPlugin to capacitor.plugins.json...');
    
    // Add the local TcpClient plugin
    pluginsJson.push({
      pkg: 'TcpClient',
      classpath: 'com.psinox.balanca.TcpClientPlugin'
    });
    
    // Write the updated JSON back
    fs.writeFileSync(pluginsJsonPath, JSON.stringify(pluginsJson, null, '\t'));
    console.log('[post-sync] TcpClientPlugin registered successfully');
  } else {
    console.log('[post-sync] TcpClientPlugin already registered');
  }

  if (!isFolderOpenerPresent) {
    console.log('[post-sync] Adding FolderOpenerPlugin to capacitor.plugins.json...');

    pluginsJson.push({
      pkg: 'FolderOpener',
      classpath: 'com.psinox.balanca.FolderOpenerPlugin'
    });

    fs.writeFileSync(pluginsJsonPath, JSON.stringify(pluginsJson, null, '\t'));
    console.log('[post-sync] FolderOpenerPlugin registered successfully');
  } else {
    console.log('[post-sync] FolderOpenerPlugin already registered');
  }
} catch (err) {
  console.error('[post-sync] Error updating capacitor.plugins.json:', err.message);
  process.exit(1);
}

