import {ClientState} from "../interfaces/client-state";
import {Gun} from "../interfaces/gun";

export class ClientGameState {
    state = ClientState.CS_SPECTATE;
    selectedGun = Gun.GUN_KNIFE;

    lifeSequence = 0;
    health = 1; // OSOK 4 eva
    armor = 0;

}