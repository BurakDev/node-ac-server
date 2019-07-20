export class MessageWriter {
    resultBuffer = Buffer.alloc(0);
    contents: any[];

    constructor() {}

    putInt(n: number): MessageWriter {
        let numBuffer: Buffer;

        if (n < 128 && n > -127) {
            // 8 bit int
            numBuffer = Buffer.alloc(1);
            numBuffer.writeInt8(n, 0);
        } else if (n < 0x8000 && n >= -0x8000) {
            // 16 bit int
            numBuffer = Buffer.alloc(3);
            numBuffer.writeInt8(0x80, 0);
            numBuffer.writeInt16LE(n, 1);
        } else {
            // 32 bit int
            numBuffer = Buffer.alloc(5);
            numBuffer.writeInt8(0x81, 0);
            numBuffer.writeInt32LE(n, 1);
        }

        this.resultBuffer = Buffer.concat([
            this.resultBuffer,
            numBuffer
        ]);

        return this;
    }

    putString(s: string): MessageWriter {
        this.resultBuffer = Buffer.concat([
            this.resultBuffer,
            Buffer.from(s)
        ]);

        return this;
    };

    getResult() {
        return this.resultBuffer;
    }
}