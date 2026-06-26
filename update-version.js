#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFile = path.join(__dirname, 'public', 'version.json');

// Gera uma nova versão baseada na data/hora
const now = new Date();
const version = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

const data = {
  version: version,
  buildTime: now.toISOString()
};

fs.writeFileSync(versionFile, JSON.stringify(data, null, 2));

console.log(`✅ Version updated to: ${version}`);
