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

export async function uploadFileToDrive(file) {
  const drive = driveClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data } = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: file.type || "application/octet-stream",
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, name",
  });

  return { driveFileId: data.id, webViewLink: data.webViewLink, name: data.name };
}

export async function deleteFileFromDrive(driveFileId) {
  if (!driveFileId) return;
  const drive = driveClient();
  await drive.files.delete({ fileId: driveFileId });
}
