import * as enet from 'enet';
import {MessageType} from "./interfaces/message-type";
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
    enet.createClient(function(err, client) {
        if (err) {
            console.log(err);
            return;
        }
        client.on("destroy", function() {
            console.log("shutdown!");
        });

        connect();

        console.log("connecting...");

        function connect() {
            client.connect(s_addr, 2, 3, function(err, peer, data) {
                if (err) {
                    console.log(err);
                    if (err.message === "host-destroyed") process.exit();
                    console.log("retrying...");
                    setTimeout(connect, 1000);
                    return;
                }

                thePeer = peer;

                console.log("connected to:", peer.address());

                peer.on("message", function(packet, chan) {
                    console.log("got message [" + chan + "]:", packet.data().toString());
                    servertoclient(chan, packet.data(), packet.data().length);
                });

                peer.on("disconnect", function() {
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
