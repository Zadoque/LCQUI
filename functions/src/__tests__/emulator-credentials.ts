import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const SA_PATH = path.resolve(process.cwd(), ".emulator-service-account.json");
const KEY_PATH = path.resolve(process.cwd(), ".emulator-private-key.pem");

function ensureEmulatorCredentials(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return;
  }

  if (!fs.existsSync(KEY_PATH)) {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    fs.writeFileSync(KEY_PATH, privateKey);
  }

  const privateKey = fs.readFileSync(KEY_PATH, "utf8");
  const serviceAccount = {
    type: "service_account",
    project_id: "lcqui-dev",
    private_key_id: "emulator-dummy",
    private_key: privateKey,
    client_email: "emulator@lcqui-dev.iam.gserviceaccount.com",
    client_id: "emulator-dummy",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };
  fs.writeFileSync(SA_PATH, JSON.stringify(serviceAccount, null, 2));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = SA_PATH;
}

ensureEmulatorCredentials();
