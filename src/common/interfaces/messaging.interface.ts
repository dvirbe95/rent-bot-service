export interface BotResponse {
    text: string;
    buttons?: any[][];
    action?: string;
    data?: any;
}

export interface IMessagingService {
    sendMessage(chatId: string, response: BotResponse): Promise<void>;
    sendMedia(chatId: string, media: any): Promise<void>;
}