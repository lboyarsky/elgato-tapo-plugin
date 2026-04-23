import streamDeck from "@elgato/streamdeck";

import { TogglePlug } from "./actions/toggle-plug";

streamDeck.actions.registerAction(new TogglePlug());
streamDeck.connect();
