/**
 * A Class that consumes a Buffer stepwise,
 * while constructing an Array with the extracted and decoded contents
 */
export class MessageReader {
    private buffer: Buffer;
    private result = [];

    /**
     * @param packet
     *      The ENetPacket to extract data from
     */
    constructor(packet: any) {
        this.buffer = packet.data();
    }

    /**
     * Reads an integer from the buffer
     */
    public readInt() {
        const c = this.readNext();

        if (c === 0x80) {
            this.result.push(
                this.readNextN(2).readInt16LE(0)
            );
        } else if (c === 0x81) {
            this.result.push(
                this.readNextN(4).readInt32LE(0)
            );
        } else {
            this.result.push(c);
        }

        return this;
    }

    /**
     * Reads a string from the buffer
     */
    public readString() {
        let char;
        let chars = [];

        do {
            char = this.readNext();
            chars.push(char);
        } while(char !== 0);

        this.result.push(
            // drop null byte at the end and convert to string
            Buffer.from(chars.slice(0, -1)).toString()
        );

        return this;
    }

    public getResult() {
        return this.result;
    }

    /**
     * Consume the next byte from the Buffer
     */
    private readNext(): number {
        const val = this.buffer[0];
        this.buffer = this.buffer.slice(1);
        return val;
    }

    /**
     * Consume the next n bytes from the Buffer
     */
    private readNextN(n): Buffer {
        const val = this.buffer.slice(0, n);
        this.buffer = this.buffer.slice(n);
        return val;
    }
}