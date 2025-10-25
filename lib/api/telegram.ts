import axios from 'axios';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
}

// Send text message to Telegram chat
export async function sendMessage(
  botToken: string,
  chatId: string,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
  try {
    const response = await axios.post(
      `${TELEGRAM_API_URL}${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }
    );

    return response.data.ok;
  } catch (error: any) {
    console.error('Telegram API Error:', error.response?.data || error.message);
    throw new Error('Failed to send Telegram message');
  }
}

// Send reference audio link
export async function sendReferenceAudio(
  botToken: string,
  chatId: string,
  audioUrl: string
): Promise<boolean> {
  // Send only the link, no extra text
  return sendMessage(botToken, chatId, audioUrl, 'Markdown');
}

// Send script as .txt file
export async function sendScript(
  botToken: string,
  chatId: string,
  script: string,
  index: number,
  total: number
): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API_URL}${botToken}/sendDocument`;

    // Create filename with index
    const filename = `${index + 1}_script.txt`;

    // Create a Blob from the script content
    const blob = new Blob([script], { type: 'text/plain' });

    // Create FormData to send the file
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, filename);
    formData.append('caption', `📝 Script ${index + 1}/${total}`);

    console.log(`📄 Sending script ${index + 1}/${total} as file: ${filename}`);

    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.ok) {
      console.log(`✓ Script ${index + 1} sent successfully`);
      return true;
    } else {
      console.error('✗ Telegram API response not OK:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error(`Telegram API Error (script ${index + 1}):`, error.response?.data || error.message);
    throw new Error(`Failed to send script ${index + 1} to Telegram`);
  }
}

// Send all scripts sequentially with delay
export async function sendAllScripts(
  botToken: string,
  chatId: string,
  scripts: string[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < scripts.length; i++) {
    try {
      await sendScript(botToken, chatId, scripts[i], i, scripts.length);
      sent++;

      // Delay to avoid rate limiting (Telegram allows ~30 messages/second)
      if (i < scripts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      failed++;
      console.error(`Failed to send script ${i + 1}:`, error);
    }
  }

  return { sent, failed };
}

// Test bot connection
export async function testBotConnection(
  botToken: string
): Promise<{ valid: boolean; botName?: string }> {
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}${botToken}/getMe`);

    return {
      valid: response.data.ok,
      botName: response.data.result?.username,
    };
  } catch (error: any) {
    return {
      valid: false,
    };
  }
}

// Send notification
export async function sendNotification(
  botToken: string,
  chatId: string,
  title: string,
  message: string
): Promise<boolean> {
  const formattedMessage = `*${title}*\n\n${message}`;
  return sendMessage(botToken, chatId, formattedMessage);
}
