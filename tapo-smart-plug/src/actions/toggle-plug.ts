import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { syncState, togglePlug } from "./plug-controller";

@action({ UUID: "com.lboyarsky.tapo-smart-plug.toggle" })
export class TogglePlug extends SingletonAction {

    override async onWillAppear(ev: WillAppearEvent): Promise<void> {
        await syncState(ev.action as never, ev.payload.settings as never);
    }

    override async onKeyDown(ev: KeyDownEvent): Promise<void> {
        await togglePlug(ev.action as never, ev.payload.settings as never);
    }
}
