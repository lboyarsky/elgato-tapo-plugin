import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be declared before imports that use them.
vi.mock("tp-link-tapo-connect", () => ({
    loginDeviceByIp: vi.fn(),
}));

vi.mock("@elgato/streamdeck", () => ({
    default: {
        settings: {
            getGlobalSettings: vi.fn(),
        },
        logger: {
            debug: vi.fn(),
            error: vi.fn(),
        },
    },
}));

vi.mock("fs", () => ({
    readFileSync: vi.fn().mockReturnValue(Buffer.from("fakepng")),
}));

vi.mock("url", () => ({
    fileURLToPath: vi.fn().mockReturnValue("/fake/bin/plugin.js"),
}));

import { syncState, togglePlug } from "../actions/plug-controller";
import { loginDeviceByIp } from "tp-link-tapo-connect";
import streamDeck from "@elgato/streamdeck";

const mockLoginDeviceByIp = vi.mocked(loginDeviceByIp);
const mockGetGlobalSettings = vi.mocked(streamDeck.settings.getGlobalSettings);

function makeDevice(deviceOn: boolean) {
    return {
        getDeviceInfo: vi.fn().mockResolvedValue({ device_on: deviceOn }),
        turnOn: vi.fn().mockResolvedValue(undefined),
        turnOff: vi.fn().mockResolvedValue(undefined),
    };
}

function makeAction(isKey = true) {
    return {
        isKey: vi.fn().mockReturnValue(isKey),
        setState: vi.fn().mockResolvedValue(undefined),
        setImage: vi.fn().mockResolvedValue(undefined),
        setSettings: vi.fn().mockResolvedValue(undefined),
        showAlert: vi.fn().mockResolvedValue(undefined),
    };
}

describe("syncState", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetGlobalSettings.mockResolvedValue({ email: "test@example.com", password: "secret" });
    });

    it("pre-loads both state images on appear", async () => {
        const device = makeDevice(false);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.setImage).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), { state: 0 });
        expect(action.setImage).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), { state: 1 });
    });

    it("sets state to OFF (0) when device is off", async () => {
        const device = makeDevice(false);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.setState).toHaveBeenCalledWith(0);
    });

    it("sets state to ON (1) when device is on", async () => {
        const device = makeDevice(true);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.setState).toHaveBeenCalledWith(1);
    });

    it("persists isOn to settings after syncing", async () => {
        const device = makeDevice(true);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.setSettings).toHaveBeenCalledWith(
            expect.objectContaining({ ip: "192.168.1.123", isOn: true })
        );
    });

    it("shows alert when device is unreachable", async () => {
        mockLoginDeviceByIp.mockRejectedValue(new Error("Connection refused"));
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.showAlert).toHaveBeenCalled();
    });

    it("shows alert when credentials are not configured", async () => {
        mockGetGlobalSettings.mockResolvedValue({});
        const action = makeAction();

        await syncState(action, { ip: "192.168.1.123" });

        expect(action.showAlert).toHaveBeenCalled();
    });

    it("does not contact device when IP is not configured, sets state OFF", async () => {
        const action = makeAction();

        await syncState(action, {});

        expect(mockLoginDeviceByIp).not.toHaveBeenCalled();
        expect(action.setState).toHaveBeenCalledWith(0);
    });
});

describe("togglePlug", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetGlobalSettings.mockResolvedValue({ email: "test@example.com", password: "secret" });
    });

    it("calls turnOff when plug is currently on", async () => {
        const device = makeDevice(true);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await togglePlug(action, { ip: "192.168.1.123", isOn: true });

        expect(device.turnOff).toHaveBeenCalled();
        expect(device.turnOn).not.toHaveBeenCalled();
    });

    it("calls turnOn when plug is currently off", async () => {
        const device = makeDevice(false);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await togglePlug(action, { ip: "192.168.1.123", isOn: false });

        expect(device.turnOn).toHaveBeenCalled();
        expect(device.turnOff).not.toHaveBeenCalled();
    });

    it("updates settings and state after successful toggle ON→OFF", async () => {
        const device = makeDevice(true);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await togglePlug(action, { ip: "192.168.1.123", isOn: true });

        expect(action.setSettings).toHaveBeenCalledWith(expect.objectContaining({ isOn: false }));
        expect(action.setState).toHaveBeenCalledWith(0);
    });

    it("updates settings and state after successful toggle OFF→ON", async () => {
        const device = makeDevice(false);
        mockLoginDeviceByIp.mockResolvedValue(device as never);
        const action = makeAction();

        await togglePlug(action, { ip: "192.168.1.123", isOn: false });

        expect(action.setSettings).toHaveBeenCalledWith(expect.objectContaining({ isOn: true }));
        expect(action.setState).toHaveBeenCalledWith(1);
    });

    it("shows alert when device command fails", async () => {
        mockLoginDeviceByIp.mockRejectedValue(new Error("Timeout"));
        const action = makeAction();

        await togglePlug(action, { ip: "192.168.1.123", isOn: false });

        expect(action.showAlert).toHaveBeenCalled();
        expect(action.setSettings).not.toHaveBeenCalled();
    });

    it("shows alert when IP is not configured", async () => {
        const action = makeAction();

        await togglePlug(action, {});

        expect(action.showAlert).toHaveBeenCalled();
        expect(mockLoginDeviceByIp).not.toHaveBeenCalled();
    });
});

