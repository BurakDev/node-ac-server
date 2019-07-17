export class Client {
    cn: number;
    name: string;

    constructor(
        public peer: any // ENetPeer
    ) {}
}
