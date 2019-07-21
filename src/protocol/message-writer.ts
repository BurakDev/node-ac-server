export class MessageWriter {
    resultBuffer = Buffer.alloc(0);

    constructor() {}

    putIpAddress(address: string) {
        const octets = address.split('.').map(octet => parseInt(octet, 10));

        console.log(octets);

        return this.append(Buffer.from([
            0x81, ...octets
        ]));
    }

    putInt(n: number): MessageWriter {
        let numBuffer: Buffer;

        if (n < 128 && n > -127) {
            // 8 bit int
            numBuffer = Buffer.alloc(1);
            numBuffer.writeInt8(n, 0);
        } else if (n < 0x8000 && n >= -0x8000) {
            // 16 bit int
            numBuffer = Buffer.alloc(3);
            numBuffer[0] = 0x80;
            numBuffer.writeInt16LE(n, 1);
        } else {
            // 32 bit int
            numBuffer = Buffer.alloc(5);
            numBuffer[0] = 0x81;
            numBuffer.writeInt32LE(n, 1);
        }

        return this.append(numBuffer);
    }

    putString(s: string): MessageWriter {
        return this
            .append(Buffer.from(s))
            .append(Buffer.from[0x00]);
    };

    append(buffer: Buffer) {
        this.resultBuffer = Buffer.concat([
            this.resultBuffer,
            buffer
        ]);

        return this;
    }

    getResult() {
        return this.resultBuffer;
    }
}