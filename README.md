# Elgato Stream Deck — Tapo Smart Plug Plugin

Control TP-Link Tapo smart plugs (P105, P115) directly from your Elgato Stream Deck. Press once to toggle the plug on; press again to toggle it off. The key icon reflects the live state.

## Features

- **Toggle on/off** with a single key press
- **Live state icon** — green plug = ON, grey plug = OFF
- **Automatic state sync** — icon updates to reflect actual device state when Stream Deck starts
- **Multiple plugs** — add one action per plug, each with its own IP
- **Shared credentials** — enter your Tapo email and password once; all keys share them

## Supported Devices

| Model | On/Off | Power Monitoring |
|-------|--------|-----------------|
| P105  | ✅     | ❌              |
| P115  | ✅     | ❌ *(future)*   |

## Requirements

- [Elgato Stream Deck software](https://www.elgato.com/downloads) v7.1 or later
- TP-Link Tapo account
- Tapo plug on the same local network as the computer running Stream Deck
- Node.js 24+ *(only needed if building from source)*

## Installation

1. Download the latest `.streamDeckPlugin` from the [Releases](../../releases) page.
2. Double-click the file — Stream Deck software will install it automatically.

## Configuration

> [!IMPORTANT]
> **Third-Party Compatibility must be enabled** in your Tapo account before this plugin can connect to your devices. In the Tapo app, go to **Me → App Settings → Third-Party Compatibility** and turn it on. Without this, all connection attempts will fail.

### 1 — Enter your Tapo credentials

Open any key's Property Inspector (right-click the key → *Settings*). Fill in:
- **Email** — your Tapo account email *(must be lowercase)*
- **Password** — your Tapo account password

These are stored once in Stream Deck's local settings and shared across all keys.

### 2 — Set the device IP address

In the Property Inspector, enter the **IP Address** of the Tapo plug (e.g. `192.168.1.123`).

**How to find the device IP:**
- Open the Tapo app → tap the device → tap the gear icon → *Device Info*
- Or log in to your router's admin page and look in the DHCP client table

### Static IP recommendation

Routers assign IP addresses dynamically by default. The plug's IP may change after a reboot or lease renewal, which would break the plugin. To prevent this:

1. Log in to your router's admin page
2. Find the DHCP settings or *IP Reservation* / *Static DHCP* section
3. Find the Tapo device's MAC address and assign it a fixed IP

This only needs to be done once per device.

## Building from Source

```bash
git clone https://github.com/lboyarsky/elgato-tapo-plugin.git
cd elgato-tapo-plugin/tapo-smart-plug
npm install
npm run build
streamdeck link com.lboyarsky.tapo-smart-plug.sdPlugin
```

For live development with hot reload:
```bash
npm run watch
```

Run tests:
```bash
npm test
```

## Architecture

- **`src/actions/plug-controller.ts`** — pure business logic (`syncState`, `togglePlug`); testable without Stream Deck SDK
- **`src/actions/toggle-plug.ts`** — thin SDK action class that delegates to the controller
- **`src/plugin.ts`** — entry point; registers the action and connects to Stream Deck

## Security

Tapo credentials are stored in Stream Deck's local settings database, which is specific to the machine and user. Credentials are never sent to any external server. All communication is directly with the Tapo device on the local network using the KLAP protocol.

## License

MIT — see [LICENSE](LICENSE)
