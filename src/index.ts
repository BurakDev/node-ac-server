import * as enet from 'enet';
import {MessageType} from "./interfaces/message-type";
import {ClientManager} from "./interfaces/client-manager";
import {Client} from "./interfaces/client";
import {MessageReader} from "./interfaces/message-reader";

enet.createServer({
        address: {
            address: "0.0.0.0",
            port: "28763"
        },
        peers: 256,
        channels: 3,
        down: 0,
        up: 1
    },
    (err, host) => {
        if (err) {
            console.log(err);
            return;
        }

        const clientManager = new ClientManager();

        /**
         * sends a message to all connected clients
         */
        function sendServerMessage(message: string) {
            const packetBuffer = Buffer.concat([
                new Buffer([MessageType.SV_SERVMSG]),
                Buffer.from(message)
            ]);

            const packet = new enet.Packet(packetBuffer, enet.PACKET_FLAG.RELIABLE);

            for (const client of clientManager.connectedClients) {
                client.peer.send(1, packet);
            }
        }

        function sendServerInfo(client: Client) {
            const packetBuffer = new Buffer([
                MessageType.SV_SERVINFO,
                client.cn,

                // not too sure what most of this is... but it works for now
                128,
                177,
                4,
                129,
                191,
                61,
                191,
                217,
                0
            ]);

            const packet = new enet.Packet(packetBuffer, enet.PACKET_FLAG.RELIABLE);

            client.peer.send(1, packet);
        }

        //host.enableCompression();
        console.log("host ready on %s:%s", host.address().address, host.address().port);

        host.on("connect", (peer, data) => {
            console.log("peer connected");

            const client = new Client(peer);
            clientManager.addClient(client);

            sendServerInfo(client);

            peer.on("message", (packet, chan) => {
                const messageReader = new MessageReader(packet).readInt();
                const [ msgType ] = messageReader.getResult();

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
                }

                if (msgType === MessageType.SV_TEXT) {
                    const [ _, chatMessage ] = messageReader
                        .readString()
                        .getResult();

                    console.log(`${client.name} says: ${chatMessage}`);
                }

                // console.log(`got message on chan ${chan}, type: ${MessageType[msgType]}, content: ${msgData}`);
            });

            setInterval(function() {
                sendServerMessage('Hey there!');
                sendServerMessage(`${clientManager.connectedClients.length} clients are currently connected`);
            }, 5000);
        });

        host.start();
    }
);