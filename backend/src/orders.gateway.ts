import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('track_order')
  handleTrackOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data && data.orderId) {
      const room = `order_${data.orderId}`;
      client.join(room);
      console.log(`Client ${client.id} joined tracking room: ${room}`);
      return { status: 'success', message: `Joined room ${room}` };
    }
    return { status: 'error', message: 'Invalid orderId' };
  }

  sendStatusUpdate(orderId: string, status: string) {
    const room = `order_${orderId}`;
    console.log(`Pushing status update for order ${orderId} -> ${status} to room ${room}`);
    this.server.to(room).emit('status_update', { orderId, status });
  }
}
