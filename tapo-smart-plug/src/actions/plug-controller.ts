import { loginDeviceByIp } from "tp-link-tapo-connect";
import streamDeck from "@elgato/streamdeck";

export type PlugSettings = {
    ip?: string;
    isOn?: boolean;
};

type GlobalSettings = {
    email?: string;
    password?: string;
};

export type ActionProxy = {
    isKey(): boolean;
    setState(state: number): Promise<void>;
    setImage(image: string, options?: { state?: number }): Promise<void>;
    setSettings(settings: PlugSettings): Promise<void>;
    showAlert(): Promise<void>;
};

export const SVG_ON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0d2a1a"/>
      <stop offset="100%" stop-color="#080d0a"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="144" height="144" rx="20" fill="url(#bg)"/>
  <circle cx="72" cy="80" r="42" fill="none" stroke="#00e676" stroke-width="18" stroke-opacity="0.08"/>
  <path d="M 49 57 A 32 32 0 1 1 95 57" fill="none" stroke="#00e676" stroke-width="8" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="72" y1="40" x2="72" y2="66" stroke="#00e676" stroke-width="8" stroke-linecap="round" filter="url(#glow)"/>
  <text x="72" y="128" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="18" font-weight="700" fill="#00e676" letter-spacing="3">ON</text>
</svg>`;

export const SVG_OFF = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#0a0a0a"/>
  <path d="M 49 57 A 32 32 0 1 1 95 57" fill="none" stroke="#3a3a3a" stroke-width="8" stroke-linecap="round"/>
  <line x1="72" y1="40" x2="72" y2="66" stroke="#3a3a3a" stroke-width="8" stroke-linecap="round"/>
  <text x="72" y="128" text-anchor="middle" font-family="'Segoe UI',sans-serif" font-size="18" font-weight="700" fill="#3a3a3a" letter-spacing="3">OFF</text>
</svg>`;

export function svgDataUri(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function getCredentials(): Promise<{ email: string; password: string }> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    streamDeck.logger.debug("Global settings received:", JSON.stringify(globals));
    const { email, password } = globals;
    if (!email || !password) {
        throw new Error("Tapo credentials not configured in plugin settings");
    }
    return { email, password };
}

export async function syncState(action: ActionProxy, settings: PlugSettings): Promise<void> {
    await Promise.all([
        action.setImage(svgDataUri(SVG_OFF), { state: 0 }),
        action.setImage(svgDataUri(SVG_ON), { state: 1 }),
    ]);

    if (!settings.ip) {
        if (action.isKey()) await action.setState(0);
        return;
    }

    try {
        const { email, password } = await getCredentials();
        const device = await loginDeviceByIp(email, password, settings.ip);
        const info = await device.getDeviceInfo();
        const isOn = info.device_on ?? false;
        await action.setSettings({ ...settings, isOn });
        if (action.isKey()) await action.setState(isOn ? 1 : 0);
    } catch (err) {
        streamDeck.logger.error("syncState failed:", err);
        await action.showAlert();
    }
}

export async function togglePlug(action: ActionProxy, settings: PlugSettings): Promise<void> {
    if (!settings.ip) {
        await action.showAlert();
        return;
    }

    try {
        const { email, password } = await getCredentials();
        const device = await loginDeviceByIp(email, password, settings.ip);
        if (settings.isOn) {
            await device.turnOff();
        } else {
            await device.turnOn();
        }
        const newIsOn = !settings.isOn;
        await action.setSettings({ ...settings, isOn: newIsOn });
        if (action.isKey()) await action.setState(newIsOn ? 1 : 0);
    } catch (err) {
        streamDeck.logger.error("togglePlug failed:", err);
        await action.showAlert();
    }
}
