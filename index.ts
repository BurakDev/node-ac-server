import * as enet from 'enet';
import { MessageType } from "./interfaces/message-type";

enet.createServer({
        address: {
            address: "127.0.0.1",
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
        //host.enableCompression();
        console.log("host ready on %s:%s", host.address().address, host.address().port);

        host.on("connect", (peer, data) => {
            console.log("peer connected");
            //peer.createWriteStream(0).write("hello I'm the server!");
            //peer.createReadStream(0).pipe(process.stdout);
            /*setTimeout(() => {
                peer.disconnectLater();
            }, 2000);*/

            // send a "hello world" message to client
            const msg = Buffer.concat([new Buffer([MessageType.SV_SERVMSG]), Buffer.from('hello world')]);
            const packet = new enet.Packet(msg, enet.PACKET_FLAG.RELIABLE);
            peer.send(1, packet);

            peer.on("disconnect", () => {
                console.log("peer disconnected");
            });

            peer.on("message", (packet, chan) => {
                console.log("got message:", packet.data().toString());
                console.log(chan);
            });
        });

        host.start();
    }
);