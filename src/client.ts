import * as enet from 'enet';
import * as util from 'util';
import {MessageType} from "./interfaces/message-type";
import {MessageReader} from "./protocol/message-reader";

const aclibrary = require('./aclibrary/aclibrary');

var s_addr = new enet.Address("185.194.142.106", 28763);
var genpwdhash;
//var s_addr = new enet.Address("92.222.37.24", 28763);

let thePeer;

aclibrary.onRuntimeInitialized = () => {
    genpwdhash = aclibrary.cwrap('genpwdhash', 'string', ['string', 'string', 'number']);
    main();
};

function main() {
    enet.createClient(function (err, client) {
        if (err) {
            console.log(err);
            return;
        }
        client.on("destroy", function () {
            console.log("shutdown!");
        });

        connect();

        console.log("connecting...");

        function connect() {
            client.connect(s_addr, 2, 3, function (err, peer, data) {
                if (err) {
                    console.log(err);
                    if (err.message === "host-destroyed") process.exit();
                    console.log("retrying...");
                    setTimeout(connect, 1000);
                    return;
                }

                thePeer = peer;

                console.log("connected to:", peer.address());

                const connect_msg = Buffer.from([84, 128, 178, 4, 128, 36, 12, 99, 101, 99, 0, 51, 54, 52, 54, 98, 50, 49, 55, 101, 53, 49, 51, 97, 102, 97, 99, 32, 57, 102, 54, 100, 50, 98, 56, 50, 100, 99, 48, 101, 102, 100, 51, 48, 32, 49, 99, 51, 99, 51, 57, 55, 55, 98, 57, 56, 97, 53, 102, 100, 101, 0, 101, 110, 0, 0, 3, 0, 0]);

                peer.send(1, connect_msg, enet.PACKET_FLAG.RELIABLE);

                peer.on("message", function (packet, chan) {
                    const messageReader = new MessageReader(packet).readInt();
                    const [ msgType ] = messageReader.getResult();

                    console.log("got message [" + chan + "]:", MessageType[msgType], packet.data());
                    //servertoclient(chan, packet.data(), packet.data().length);
                });

                peer.on("disconnect", function () {
                    console.log("disconnected");
                    client.destroy();
                });
            });
        }
    });
}

function servertoclient(chan, buffer, len, demo?) {
    switch(chan) {
        case 1:
            parsemessages(-1, null, buffer, len);
        break;
    }
}

function parsemessages(cn, playerent, buffer, demo) {
    var type = 0, joining = 0;

    buffer = Array.from(buffer);
    console.log(buffer);

    while (buffer.length > 0) {
        const type = buffer.shift() as MessageType;

        switch(type) {
            case MessageType.SV_SERVINFO:
                const mycn = buffer.shift();
                const prot = buffer.shift();
                const sessionid = buffer.shift();
                console.log(mycn, prot, sessionid);

                var bufferPacket = Buffer.concat([Buffer.from('80400C427572616B00', 'hex'), Buffer.from(genpwdhash('Burak', '', sessionid)), Buffer.from('00656E0000050200', 'hex')]);
                //var packet1 = new enet.Packet(Buffer.from('80400C427572616B00643466383363663237316334376636362061316331656130613537303634613831203234636231336466386166653237306600656E0000050200', 'hex'), enet.PACKET_FLAG.RELIABLE);
                var packet1 = new enet.Packet(bufferPacket, enet.PACKET_FLAG.RELIABLE);
                console.log("sending packet 1...");
                thePeer.send(1, packet1, function (err) {
                    if (err) {
                        console.log("error sending packet 1:", err);
                    } else {
                        console.log("packet 1 sent.");
                    }
                });

                //80400C427572616B00643466383363663237316334376636362061316331656130613537303634613831203234636231336466386166653237306600656E0000050200
            break;
        }
        break;
    }
}
