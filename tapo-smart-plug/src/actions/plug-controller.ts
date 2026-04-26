import { loginDeviceByIp } from "tp-link-tapo-connect";
import streamDeck from "@elgato/streamdeck";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type PlugSettings = {
    ip?: string;
    isOn?: boolean;
    iconStyle?: "power" | "lamp";
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

function pngDataUri(relativePath: string): string {
    const file = path.join(__dirname, "..", relativePath);
    return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

const POWER_ON  = pngDataUri("imgs/power-on.png");
const POWER_OFF = pngDataUri("imgs/power-off.png");
const LAMP_ON   = pngDataUri("imgs/lamp-on.png");
const LAMP_OFF  = pngDataUri("imgs/lamp-off.png");

function getIcons(style: PlugSettings["iconStyle"]): { off: string; on: string } {
    if (style === "lamp") {
        return { off: LAMP_OFF, on: LAMP_ON };
    }
    return { off: POWER_OFF, on: POWER_ON };
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
    const icons = getIcons(settings.iconStyle);
    await Promise.all([
        action.setImage(icons.off, { state: 0 }),
        action.setImage(icons.on,  { state: 1 }),
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
