const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            console.error('TELEGRAM_BOT_TOKEN is not set');
            return false;
        }

        const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            console.error('Telegram API error:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        return false;
    }
}

export function isUrl(text: string): boolean {
    // Simple URL detection - matches http:// or https:// URLs
    const urlPattern = /^https?:\/\/\S+$/i;
    return urlPattern.test(text.trim());
}

// Telegram update types (simplified)
export interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from?: {
            id: number;
            is_bot: boolean;
            first_name: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        date: number;
        text?: string;
    };
}
