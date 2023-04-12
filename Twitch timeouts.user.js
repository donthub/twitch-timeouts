// ==UserScript==
// @name         Twitch timeouts
// @version      0.1
// @description  Display timeouts and bans in Twitch chat
// @match        https://www.twitch.tv/*
// @grant        none
// ==/UserScript==

class Formatter {
    #roundPrecision = 2;
    #units = {
        "minute": 60,
        "hour": 60 * 60,
        "day": 60 * 60 * 24,
        "week": 60 * 60 * 24 * 7
    }

    /**
    * Adds grouping separators for large numbers. E.g.: 1200000 -> 1,200,000
    */
    #formatNumber(number) {
        let formattedNumber = "";
        let counter = 0;
        for (let i = number.length - 1; i >= 0; i--) {
            if (counter == 3) {
                formattedNumber = `,${formattedNumber}`;
                counter = 0;
            }
            counter++;
            formattedNumber = `${number.charAt(i)}${formattedNumber}`;
        }
        return formattedNumber;
    }

    /**
    * Formats duration to given unit and precision, with singular/plural unit name
    */
    #formatDuration(duration, unit) {
        let formattedSeconds = duration == 1 ? `${duration} second` : `${this.#formatNumber(duration)} seconds`;
        if (unit === "second") {
            return formattedSeconds;
        }
        let precision = Math.pow(10, this.#roundPrecision);
        let unitDuration = Math.round(duration / this.#units[unit] * precision) / precision;
        let formattedUnit = unitDuration == 1 ? `${unitDuration} ${unit}` : `${unitDuration} ${unit}s`;
        return `${formattedUnit} (${formattedSeconds})`;
    }

    /**
    * Converts duration to closest applicable time unit and keeps original in parentheses. E.g.: 604800 -> 1 week (604,800 seconds)
    */
    calculateDuration(duration) {
        if (duration < this.#units.minute) {
            return this.#formatDuration(duration, "second");
        }
        if (duration < this.#units.hour) {
            return this.#formatDuration(duration, "minute");
        }
        if (duration < this.#units.day) {
            return this.#formatDuration(duration, "hour");
        }
        if (duration < this.#units.week) {
            return this.#formatDuration(duration, "day");
        }
        return this.#formatDuration(duration, "week");
    }
};

class Chat {
    #customClass = "twitch-timeout";
    #chatLogSelector = "#live-page-chat [role=log]";
    #formatter = new Formatter();

    printTimeout(user, duration, lastMessage) {
        let message = duration ? `<strong>${user}</strong> <em>was timed out for</em> <strong>${this.#formatter.calculateDuration(duration)}</strong>.` : `<strong>${user}</strong> <em>was</em> <strong>permanently banned</strong>.`;
        if (lastMessage) {
            let lastMessageHtml = document.createElement('div')
                .appendChild(document.createTextNode(lastMessage))
                .parentNode
                .innerHTML;
            message = `${message} <em>Last message:</em><br/>${lastMessageHtml}`;
        }
        let line = document.createElement("div");
        line.classList.add("chat-line__status", this.#customClass);
        line.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        let span = document.createElement("span");
        span.innerHTML = message;
        line.appendChild(span);
        let element = document.querySelector(this.#chatLogSelector);
        element.appendChild(line);
    }

    /**
    * Remove old timeout message at the top of the chat log.
    */
    removeOldTimeout() {
        let element = document.querySelector(this.#chatLogSelector);
        let firstChild = element.firstChild;
        if (firstChild?.classList.contains(this.#customClass)) {
            firstChild.remove();
        }
    }

};

class IrcReader {
    #socketAddress = "wss://irc-ws.chat.twitch.tv/";
    #channelRegex = /.*twitch\.tv\/(\w+)/;
    #timeoutRegex = /@(ban-duration=(\d+))?.+ CLEARCHAT #\w+ :(.+)/;
    #messageRegex = /@.*name=(.*?);.* PRIVMSG #\w+ :(.+)/;
    #username = `justinfan${Math.floor(Math.random() * 100000)}`; // Twitch default for anonymous users
    #password = "SCHMOOPIIE"; // Twitch default for anonymous users
    #chat = new Chat();
    #lastMessage = {};

    run() {
        let channelFound = window.location.href.match(this.#channelRegex);
        if (!channelFound) {
           return;
        }

        let channel = channelFound[1];
        let socket = new WebSocket(this.#socketAddress);
        socket.addEventListener("open", (event) => {
            socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
            socket.send(`PASS ${this.#password}`);
            socket.send(`NICK ${this.#username}`);
            socket.send(`USER ${this.#username} 8 * :${this.#username}`);
            socket.send(`JOIN #${channel}`);
        });

        socket.addEventListener("message", (event) => {
            if (event.data.startsWith("PING")) {
                socket.send("PONG");
            }

            let messageFound = event.data.match(this.#messageRegex);
            if (messageFound) {
                let name = messageFound[1].toLowerCase();
                let message = messageFound[2];
                this.#lastMessage[name] = message;
            }

            let timeoutFound = event.data.match(this.#timeoutRegex);
            if (timeoutFound) {
                let user = timeoutFound[3];
                let message = timeoutFound[2];
                this.#chat.printTimeout(user, message, this.#lastMessage[user]);
            }

            this.#chat.removeOldTimeout();

            // console.log(`Message from server: ${event.data}`);
        });
    }

}


(function() {
    'use strict';

    new IrcReader().run();
})();
