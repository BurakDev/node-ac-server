import * as enet from 'enet';
import { promisify } from 'util';
import {MessageType} from "./interfaces/message-type";
import {ClientManager} from "./interfaces/client-manager";
import {Client} from "./interfaces/client";
import {MessageReader} from "./interfaces/message-reader";
import {MessageWriter} from "./interfaces/message-writer";

async function main() {
    // bootstrap internal modules
    const clientManager = new ClientManager();


    /**
     * sends a message to all connected clients
     */
    function sendServerMessage(message: string) {
        const writer = new MessageWriter();
        writer
            .putInt(MessageType.SV_SERVMSG)
            .putString(message);

        const packet = new enet.Packet(writer.getResult(), enet.PACKET_FLAG.RELIABLE);

        for (const client of clientManager.connectedClients) {
            client.peer.send(1, packet);
        }
    }

    function sendServerInfo(client: Client) {
        const writer = new MessageWriter();
        writer
            .putInt(MessageType.SV_SERVINFO)
            .putInt(client.cn)
            .putInt(1201) // ac protocol version
            .putInt(-641778241) // salt
            .putInt(0); // hasPassword

        const packet = new enet.Packet(writer.getResult(), enet.PACKET_FLAG.RELIABLE);

        client.peer.send(1, packet);
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

        sendServerInfo(client);

        peer.on("message", (packet, chan) => {
            const messageReader = new MessageReader(packet.data()).readInt();
            const [ msgType ] = messageReader.getResult();

            if (msgType !== MessageType.SV_POSC && msgType !== MessageType.SV_PING) {
                console.log(`got message on chan ${chan}, type: ${MessageType[msgType]}, content:  `, Array.from(packet.data()));
            }

            if ([MessageType.SV_POSC, MessageType.SV_PING].includes(msgType)) {
                // ignore those for now, just to stop spamming the console

                return;
            }

            if (msgType === MessageType.SV_CONNECT) {
                const parsedContent = messageReader
                    .readInt()
                    .readInt()
                    .readString()
                    .getResult();

                const [ _, acVersion, buildType, playerName ] = parsedContent;

                client.name = playerName;

                console.log('sv_connect', playerName);
                sendServerMessage(`hey ${playerName}!`);

                // TODO: send SV_WELCOME message to client
            }

            if (msgType === MessageType.SV_TEXT) {
                const [ _, chatMessage ] = messageReader
                    .readString()
                    .getResult();

                console.log(`${client.name} says: ${chatMessage}`);

                // text messages are encased in client messages, so the client knows who sent the message
                const packetBuffer = Buffer.concat([
                    Buffer.from([
                        MessageType.SV_CLIENT,
                        client.cn,
                        chatMessage.length + 1,
                        MessageType.SV_TEXT
                    ]),
                    Buffer.from(chatMessage)
                ]);
                const packet = new enet.Packet(packetBuffer, enet.PACKET_FLAG.RELIABLE);

                const recipients = clientManager.connectedClients.filter(recipient => recipient.cn !== client.cn);
                for (const recipient of recipients) {
                    recipient.peer.send(1, packet);
                }
            }
        });

        setInterval(function() {
            sendServerMessage('Hey there!');
            sendServerMessage(`${clientManager.connectedClients.length} clients are currently connected`);
        }, 5000);
    });

    host.start();
}

main();
