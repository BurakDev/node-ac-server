export class Client {
    cn: number;
    name: string;
    address: string;

    constructor(
        public peer: any // ENetPeer
    ) {
        this.address = peer.address().address;
    }
}
