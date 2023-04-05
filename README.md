# twitch-timeouts

## Setup

Import or copy-paste contents of [Twitch timeouts.user.js](https://github.com/donthub/twitch-timeouts/blob/main/Twitch%20timeouts.user.js) into the UserScript manager of your choice (e.g. [TamperMonkey](https://www.tampermonkey.net/)).

## Usage

Timeouts and bans will appear in Twitch chat automatically, e.g.:

> testuser was timed out for 10 minutes (600 seconds).

and

> testuser was banned permanently.

## How does it work?

The userscript creates a WebSocket connection to Twitch IRC servers, logs in as anonymous user to the Twitch channel's IRC channel, and looks for `CLEARCHAT` messages that are triggered by user timeouts. When found, it prints the user and duration to the Twitch chat.
