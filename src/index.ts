import * as enet from 'enet';
import { promisify } from 'util';
import {MessageType} from "./interfaces/message-type";
import {ClientManager} from "./services/client-manager";
import {Client} from "./entities/client";
import {MessageReader} from "./protocol/message-reader";
import {MessageComposer} from "./protocol/message-composer";
import {Color} from "./interfaces/color";
import {TextWriter} from "./protocol/text-writer";

async function main() {
    // bootstrap internal modules
    const clientManager = new ClientManager();
    const composer = new MessageComposer(clientManager);


    /**
     * sends a message to all connected clients
     */
    function sendServerMessage(message: string) {
        const msgBuffer = composer.serverMessage(message);

        const packet = new enet.Packet(msgBuffer, enet.PACKET_FLAG.RELIABLE);

        for (const client of clientManager.connectedClients) {
            client.peer.send(1, packet);
        }
    }

    function sendServerInfo(client: Client) {
        const msgBuffer = composer.serverInfo(client.cn);

        const packet = new enet.Packet(msgBuffer, enet.PACKET_FLAG.RELIABLE);

        client.peer.send(1, packet);
    }

    function sendWelcomeMessage(client: Client) {
        const msgBuffer = composer.welcome(client.cn);

        const packet = new enet.Packet(msgBuffer, enet.PACKET_FLAG.RELIABLE);

        client.peer.send(1, packet);
    }

    function relayChatMessage(client: Client, message: string) {
        const msgBuffer = composer.publicChatMessage(client.cn, message);

        const packet = new enet.Packet(msgBuffer, enet.PACKET_FLAG.RELIABLE);

        const recipients = clientManager.connectedClients.filter(recipient => recipient.cn !== client.cn);
        for (const recipient of recipients) {
            recipient.peer.send(1, packet);
        }
    }

    // bootstrap server
    const host = await promisify(enet.createServer)({
        address: {
            address: "0.0.0.0",
            port: "28763"
        },
        peers: 256,
        channels: 3,
        down: 0,
        up: 1
    });

    //host.enableCompression();
    console.log("host ready on %s:%s", host.address().address, host.address().port);

    host.on("connect", (peer, data) => {
        console.log("peer connected");

        const client = new Client(peer);
        clientManager.addClient(client);

        console.log(client.peer.address().address);

        sendServerInfo(client);

        peer.on("message", (packet, chan) => {
            const messageReader = new MessageReader(packet.data()).readInt();
            const [ msgType ] = messageReader.getResult();

            if (msgType === MessageType.SV_POSC) {
                // ignore those for now, just to stop spamming the console
                return;
            }

            if (msgType === MessageType.SV_PING) {
                const pingReader = new MessageReader(packet.data())
                    .readInt()
                    .readInt();

                const [ _, val ] = pingReader.getResult();

                const pongBuffer = MessageComposer.pong(val);
                peer.send(1, pongBuffer);
                return;
            }


            console.log(`got message on chan ${chan}, type: ${MessageType[msgType]}, content:  `, Array.from(packet.data()));


            if (msgType === MessageType.SV_CONNECT) {
                const parsedContent = messageReader
                    .readInt()
                    .readInt()
                    .readString()
                    .getResult();

                const [ _, acVersion, buildType, playerName ] = parsedContent;

                client.name = playerName;

                sendWelcomeMessage(client);
                return;
            }

            if (msgType === MessageType.SV_CALLVOTE) {
                sendServerMessage(
                    new TextWriter()
                        .setColor(Color.Red1)
                        .addText('Voting is not implemented yet')
                        .getText()
                );
                return;
            }

            if (msgType === MessageType.SV_TEXT) {
                const [ _, chatMessage ] = messageReader
                    .readString()
                    .getResult();

                console.log(`${client.name} says: ${chatMessage}`);
                relayChatMessage(client, chatMessage);
            }
        });
    });

    host.start();

    setInterval(function() {
        sendServerMessage(
            new TextWriter()
                .setColor(Color.Green0)
                .addText(clientManager.connectedClients.length)
                .setColor(Color.Green1)
                .addText(' clients are currently connected')
                .getText()
        );
    }, 20000);
}

main();
