export interface TelegramConfig {
  token: string;
  chatId: string;
}

export const sendTelegramMessageWithRetry = async (
  token: string,
  chatId: string,
  text: string,
  retries: number = 3,
  backoff: number = 1000
): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chatId, text }),
      });
      if (response.ok) return true;
      throw new Error('Failed to send');
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed for Telegram message.`);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, backoff * Math.pow(2, i)));
      } else {
        console.error('Telegram bot connection failed after 3 attempts.');
      }
    }
  }
  return false;
};

export const verifyConnection = async (token: string, chatId: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/telegram/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, chatId }),
        });
        return response.ok;
    } catch {
        return false;
    }
};

export const requestPayment = async (token: string, chatId: string): Promise<boolean> => {
    return await sendTelegramMessageWithRetry(token, chatId, "/payment_request");
};

export const checkPaymentStatus = async (token: string, chatId: string): Promise<boolean> => {
    return await sendTelegramMessageWithRetry(token, chatId, "/status");
};
