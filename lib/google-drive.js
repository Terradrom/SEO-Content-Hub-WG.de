import { google } from "googleapis";
import { Readable } from "node:stream";

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

function driveClient() {
  if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error("Drive isn't connected yet — visit /api/auth/google/start while signed in as manager");
  }
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth });
}

// Subfolder-per-content-type lookup, cached per warm process so we don't
// re-search Drive on every upload. Creates the subfolder the first time
// a given type is seen.
const folderCache = new Map();

async function getOrCreateTypeFolder(drive, typeName) {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!typeName) return rootId;
  if (folderCache.has(typeName)) return folderCache.get(typeName);

  const escaped = typeName.replace(/'/g, "\\'");
  const q = `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false`;
  const { data: existing } = await drive.files.list({ q, fields: "files(id, name)" });

  let folderId;
  if (existing.files && existing.files.length > 0) {
    folderId = existing.files[0].id;
  } else {
    const { data: created } = await drive.files.create({
      requestBody: { name: typeName, mimeType: "application/vnd.google-apps.folder", parents: [rootId] },
      fields: "id",
    });
    folderId = created.id;
  }
  folderCache.set(typeName, folderId);
  return folderId;
}

// "invalid_grant" means the refresh token itself is dead (expired or
// revoked) — no retry will fix it, someone has to reconnect Drive via
// /api/auth/google/start. Surface that clearly instead of a raw Google
// API error.
function wrapDriveError(err) {
  const isInvalidGrant = err?.response?.data?.error === "invalid_grant" || /invalid_grant/i.test(err?.message || "");
  if (isInvalidGrant) {
    return new Error(
      "Drive's connection has expired and needs to be reconnected — ask a manager to sign in and visit /api/auth/google/start again."
    );
  }
  return err;
}

export async function uploadFileToDrive(file, typeName) {
  const drive = driveClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const parentId = await getOrCreateTypeFolder(drive, typeName);

    const { data } = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [parentId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: Readable.from(buffer),
      },
      fields: "id, webViewLink, name",
    });

    return { driveFileId: data.id, webViewLink: data.webViewLink, name: data.name };
  } catch (err) {
    throw wrapDriveError(err);
  }
}

export async function deleteFileFromDrive(driveFileId) {
  if (!driveFileId) return;
  const drive = driveClient();
  try {
    await drive.files.delete({ fileId: driveFileId });
  } catch (err) {
    throw wrapDriveError(err);
  }
}
