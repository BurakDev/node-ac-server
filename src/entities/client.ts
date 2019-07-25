import {Team} from "../interfaces/team";

export class Client {
    cn: number;
    name: string;
    address: string;

    skinCLA = 3;
    skinRVSF = 0;
    team = Team.TEAM_SPECT;

    constructor(
        public peer: any // ENetPeer
    ) {
        this.address = peer.address().address;
    }
}
