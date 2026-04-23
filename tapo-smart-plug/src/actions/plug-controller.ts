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
  <circle cx="72" cy="72" r="72" fill="#2ECC71"/>
  <rect x="54" y="28" width="12" height="36" rx="4" fill="white"/>
  <rect x="78" y="28" width="12" height="36" rx="4" fill="white"/>
  <path d="M44 72 C44 99.6 55.6 116 72 116 C88.4 116 100 99.6 100 72 L44 72 Z" fill="white"/>
  <rect x="66" y="116" width="12" height="16" rx="4" fill="white"/>
</svg>`;

export const SVG_OFF = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <circle cx="72" cy="72" r="72" fill="#555555"/>
  <rect x="54" y="28" width="12" height="36" rx="4" fill="#AAAAAA"/>
  <rect x="78" y="28" width="12" height="36" rx="4" fill="#AAAAAA"/>
  <path d="M44 72 C44 99.6 55.6 116 72 116 C88.4 116 100 99.6 100 72 L44 72 Z" fill="#AAAAAA"/>
  <rect x="66" y="116" width="12" height="16" rx="4" fill="#AAAAAA"/>
</svg>`;

export function svgDataUri(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function getCredentials(): Promise<{ email: string; password: string }> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
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
    } catch {
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
    } catch {
        await action.showAlert();
    }
}
