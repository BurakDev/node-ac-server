import {ClientManager} from "../services/client-manager";
import {MessageWriter} from "./message-writer";
import {MessageType} from "../interfaces/message-type";
import {GameMode} from "../interfaces/game-mode";
import {Team} from "../interfaces/team";
import {Client} from "../entities/client";

export class MessageComposer {
    constructor(private clientManager: ClientManager) {
    }

    publicChatMessage(senderCn: number, message: string) {
        return new MessageWriter()
            .putInt(MessageType.SV_CLIENT)
            .putInt(senderCn)
            .putInt(message.length + 1)
            .putInt(MessageType.SV_TEXT)
            .putString(message)
            .getResult();
    }

    motd(motd: string) {
        return new MessageWriter()
            .putInt(MessageType.SV_TEXT)
            .putString(motd)
            .getResult();
    }

    serverMessage(message: string) {
        return new MessageWriter()
            .putInt(MessageType.SV_SERVMSG)
            .putString(message)
            .getResult();
    }

    serverInfo(cn: number) {
        return new MessageWriter()
            .putInt(MessageType.SV_SERVINFO)
            .putInt(cn)
            .putInt(1201) // ac protocol version
            .putInt(-641778241) // salt
            .putInt(0)
            .getResult(); // hasPassword
    }

    mapChange(mapName: string, gamemode: GameMode, available: number, revision: number) {
        return new MessageWriter()
            .putInt(MessageType.SV_MAPCHANGE)
            .putString(mapName)
            .putInt(gamemode)
            .putInt(available)
            .putInt(revision)
            .getResult();
    }

    timeUp() {
        return new MessageWriter()
            .putInt(MessageType.SV_TIMEUP)
            .putInt(5000) // time elapsed
            .putInt(720000) // max time
            .getResult();
    }

    itemList() {
        return new MessageWriter()
            .putInt(MessageType.SV_ITEMLIST)
            // stub
            .putInt(-1)
            .getResult();
    }

    setTeam(cn: number, team: Team) {
        return new MessageWriter()
            .putInt(MessageType.SV_SETTEAM)
            .putInt(cn)
            .putInt(team)
            .getResult();
    }

    forceDeath(cn: number) {
        return new MessageWriter()
            .putInt(MessageType.SV_FORCEDEATH)
            .putInt(cn)
            .getResult();
    }

    resume(cn: number) {
        const writer = new MessageWriter()
            .putInt(MessageType.SV_RESUME);

        const otherClients = this.clientManager.connectedClients.filter(c => c.cn !== cn);

        for (const client of otherClients) {
            writer
                .putInt(client.cn)
                .putInt(0) // state
                .putInt(0) // lifesequence
                .putInt(5) // primary
                .putInt(5) // gunselect
                .putInt(0) // flagscore
                .putInt(0) // frags
                .putInt(0) // deaths
                .putInt(1) // health
                .putInt(0) // armour
                .putInt(0) // points
                .putInt(0) // teamkills

                // for each gun: client's ammo
                .putInt(1)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(15)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(0)

                // for each gun: client's no of magazines
                .putInt(1)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(5)
                .putInt(0)
                .putInt(0)
                .putInt(0)
                .putInt(0)
        }

        // end of SV_RESUME
        writer.putInt(-1);

        return writer.getResult();
    }

    initClient(client: Client) {
        return new MessageWriter()
            .putInt(MessageType.SV_INITCLIENT)
            .putInt(client.cn)
            .putString(client.name)
            .putInt(3) // c.skin[TEAM_CLA]
            .putInt(0) // c.skin[TEAM_RVSF]
            .putIpAddress(client.address)
            .getResult();
    }

    serverMode() {
        return new MessageWriter()
            .putInt(MessageType.SV_SERVERMODE)
            .putInt(1) // ¯\_(ツ)_/¯
            .getResult();
    }

    welcome(cn: number) {
        const writer = new MessageWriter();

        writer
            .putInt(MessageType.SV_WELCOME)
            .putInt(this.clientManager.connectedClients.length);

        writer.append(this.mapChange(
            'ac_douze',
            GameMode.OSOK,
            0,
            0
        ));

        writer.append(this.timeUp());

        writer.append(this.itemList());

        writer.append(this.setTeam(cn, Team.TEAM_SPECT));

        writer.append(this.forceDeath(cn));

        writer.append(this.resume(cn));

        const otherClients = this.clientManager.connectedClients.filter(c => c.cn !== cn);
        for (const client of otherClients) {
            writer.append(this.initClient(client));
        }

        writer.append(this.serverMode());

        writer.append(this.motd('Welcome :)'));

        return writer.getResult();
    }
}