import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'geo';
const GEO_FOLDER = path.join(__dirname, '../public/geo');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getFiles(dir, baseDir = '') {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const subFiles = await getFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      files.push({
        fullPath,
        relativePath,
      });
    }
  }

  return files;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(file, attempts = 3) {
  const fileContent = fs.readFileSync(file.fullPath);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(file.relativePath, fileContent, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!error) return null;
    if (attempt === attempts) return error.message;
    await sleep(500 * attempt);
  }
}

async function collectRemotePaths(prefix = '', pathSet = new Set()) {
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw new Error(`List failed for "${prefix}": ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        pathSet.add(itemPath);
      } else {
        await collectRemotePaths(itemPath, pathSet);
      }
    }

    if (data.length < 100) break;
    offset += 100;
  }
  return pathSet;
}

async function uploadGeoFiles() {
  try {
    console.log(`Starting upload from ${GEO_FOLDER} to Supabase bucket: ${BUCKET_NAME}`);

    if (!fs.existsSync(GEO_FOLDER)) {
      console.error(`Error: Geo folder not found at ${GEO_FOLDER}`);
      process.exit(1);
    }

    const localFiles = await getFiles(GEO_FOLDER);
    const localMap = new Map(localFiles.map((f) => [f.relativePath, f]));
    let files = localFiles;

    const retryFromFileArg = process.argv.find((arg) => arg.startsWith('--from-file='));
    if (retryFromFileArg) {
      const listPath = retryFromFileArg.split('=')[1];
      const fullListPath = path.isAbsolute(listPath) ? listPath : path.join(__dirname, '..', listPath);
      const lines = fs.readFileSync(fullListPath, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      files = lines.map((p) => localMap.get(p)).filter(Boolean);
      console.log(`Retrying from list file: ${fullListPath}`);
      console.log(`Listed: ${lines.length} | Found locally: ${files.length}`);
    }

    if (!retryFromFileArg && process.argv.includes('--missing-only')) {
      console.log('Checking bucket for already uploaded files...');
      const remotePaths = await collectRemotePaths('');
      files = localFiles.filter((f) => !remotePaths.has(f.relativePath));
      console.log(`Missing files to upload: ${files.length}`);
    } else {
      console.log(`Found ${files.length} files to upload`);
    }

    if (!files.length) {
      console.log('\n✅ Nothing to upload. Bucket is already in sync.');
      return;
    }

    let successful = 0;
    const failedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const errorMessage = await uploadWithRetry(file);
        if (errorMessage) {
          console.error(`Failed to upload ${file.relativePath}:`, errorMessage);
          failedFiles.push(file.relativePath);
        } else {
          successful++;
        }

        if ((i + 1) % 100 === 0 || i + 1 === files.length) {
          console.log(`Progress: processed ${i + 1}/${files.length} | ok ${successful} | failed ${failedFiles.length}`);
        }
      } catch (err) {
        console.error(`Error uploading ${file.relativePath}:`, err.message);
        failedFiles.push(file.relativePath);
      }
    }

    console.log(`\n✅ Upload complete!`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failedFiles.length}`);
    console.log(`   Total: ${files.length}`);

    if (failedFiles.length) {
      const failedPath = path.join(__dirname, '../upload-failed-geo-files.txt');
      fs.writeFileSync(failedPath, failedFiles.join('\n') + '\n');
      console.log(`   Failed file list: ${failedPath}`);
    }

    if (!failedFiles.length) {
      console.log(`\n✨ All files uploaded successfully!`);
      console.log(`Your geo files are now available at: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

uploadGeoFiles();
