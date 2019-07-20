import {ClientManager} from "../services/client-manager";
import {MessageWriter} from "./message-writer";
import {MessageType} from "../interfaces/message-type";

export class MessageComposer {
    constructor(clientManager: ClientManager) {
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
            .putInt(0); // hasPassword
    }
}