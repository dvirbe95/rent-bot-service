import { BotResponse } from "../../../../common/interfaces/messaging.interface";

export abstract class BaseFlow {
    constructor(
        protected ragService: any,
        protected apartmentRepo: any,
        protected userRepo: any
    ) {}
    abstract handle(chatId: string, text: string, user: any, userName: string): Promise<BotResponse>;
}