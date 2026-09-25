import { settingsStore } from "../db";
import fs from "node:fs";
import { X509Certificate } from "node:crypto";
import type { AppSettings } from "../db/stores/settingsStore";
import { config } from "../config/config";
const DEFAULT_JWT_LIFETIME_MINUTES = 480;

export interface UpdateSessionSettingsOptions {
  jwtLifetimeMinutes: number;

}export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
}
export async function getSettings(): Promise<AppSettings> {
  const settings = await settingsStore.get();

  return {
    session: {
      jwtLifetimeMinutes:
        settings?.session.jwtLifetimeMinutes ?? DEFAULT_JWT_LIFETIME_MINUTES,
    },
  };
}

export async function updateSessionSettings({
  jwtLifetimeMinutes,
}: UpdateSessionSettingsOptions): Promise<AppSettings> {
  
  await settingsStore.updateSessionSettings({
    jwtLifetimeMinutes
  });

  return getSettings();
}


export function getCertificateInfo(): CertificateInfo {
  if (!config.server.https.enabled) {
    throw new Error("HTTPS is not enabled");
  }

  const pem = fs.readFileSync(
    config.server.https.certPath,
    "utf8",
  );

  const cert = new X509Certificate(pem);

  return {
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: new Date(cert.validFrom),
    validTo: new Date(cert.validTo),
    fingerprint: cert.fingerprint256,
  };
}
