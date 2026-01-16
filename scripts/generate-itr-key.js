#!/usr/bin/env node

/**
 * Generate ITR Encryption Key
 * 
 * This script generates a secure 256-bit (32-byte) encryption key
 * for the ITR filing module.
 * 
 * Usage:
 *   node scripts/generate-itr-key.js
 * 
 * Output:
 *   A 64-character hexadecimal string suitable for use as ITR_ENCRYPTION_KEY
 */

const crypto = require('crypto');

// Generate a random 32-byte (256-bit) key
const key = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 ITR Encryption Key Generated\n');
console.log('='.repeat(64));
console.log(key);
console.log('='.repeat(64));
console.log('\n📋 Add this to your environment variables:\n');
console.log(`   ITR_ENCRYPTION_KEY=${key}\n`);
console.log('📝 For local development, add to .env.local:');
console.log(`   ITR_ENCRYPTION_KEY=${key}\n`);
console.log('⚠️  Keep this key secure and never commit it to version control!\n');

