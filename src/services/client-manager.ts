import { Client } from "../entities/client";
import * as nconf from 'nconf';

export class ClientManager {
    private maxClients = nconf.get('server:max_clients');
    private clients: Client[] = Array(this.maxClients);

    get connectedClients() {
        return this.clients.filter(c => !!c);
    }

    public addClient(client: Client) {
        if (this.clients.length > this.maxClients) {
            throw new Error('Client limit exceeded');
        }

        const cn = this.getLowestValidClientNumber();
        client.cn = cn;
        this.clients[cn] = client;

        client.peer.on('disconnect', () => {
            console.info(`Client ${cn} disconnected`);
            this.removeClient(cn);
        });

        return
    }

    private removeClient(cn: number) {
        this.clients[cn] = undefined;
    }

    private getLowestValidClientNumber() {
        return this.clients.findIndex(c => !c);
    }
}