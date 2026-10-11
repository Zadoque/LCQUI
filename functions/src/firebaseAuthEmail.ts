import { defineString } from "firebase-functions/params";

// O envio oficial de e-mail do Firebase Auth usa a API Identity Toolkit.
// No Emulator Suite a mesma chamada produz um OOB inspecionável.
export const firebaseWebApiKey = defineString("LCQUI_WEB_API_KEY", { default: "demo-api-key" });

export function obterFirebaseWebApiKey(): string {
  if (process.env.LCQUI_WEB_API_KEY) return process.env.LCQUI_WEB_API_KEY;
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  try {
    const valor = firebaseWebApiKey.value();
    if (valor) return valor;
  } catch {
    // Fora do runtime de Functions v2 (por exemplo, testes unitários).
  }
  return "demo-api-key";
}

export async function dispararPasswordResetFirebaseAuth(
  email: string,
  continueUrl: string,
  apiKeyParam?: string
): Promise<{ ok: boolean; oobLink?: string; error?: string }> {
  const apiKey = apiKeyParam || obterFirebaseWebApiKey();
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const url = emulatorHost
    ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email, continueUrl }),
    });
    if (!response.ok) return { ok: false, error: await response.text() };
    const data = (await response.json()) as { oobLink?: string };
    return { ok: true, oobLink: data.oobLink };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
