import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService, StreamEvent } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** Non-streaming chat (kept for simple clients and as a fallback). */
  @Post('chat')
  chat(@Body() body: ChatRequestDto) {
    return this.ai.chat(body.message, body.history ?? []);
  }

  /**
   * Streaming chat over Server-Sent Events. With OpenAI the model runs a
   * tool-calling loop against the bank's data and the final answer streams
   * token-by-token. Each SSE frame is a JSON-encoded `StreamEvent`.
   */
  @Post('chat/stream')
  async stream(
    @Body() body: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();

    const send = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      await this.ai.chatStream(body.message, body.history ?? [], send);
    } catch (err) {
      send({ type: 'error', message: (err as Error).message });
    } finally {
      res.end();
    }
  }
}
