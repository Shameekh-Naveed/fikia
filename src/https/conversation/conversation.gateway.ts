import { UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Socket, Server } from 'socket.io';
import { WebSocketPermissionsGuard } from 'src/authorization/permissions/websocket-permissions.guard';
import { Conversation } from 'src/db/schemas/conversations.schema';
import { JwtGuard } from '../auth/guards/jwt-auth.guard';

// @WebSocketGateway(2080, { namespace: '/chat' })
@WebSocketGateway(2080, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ConversationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel('Conversation')
    private readonly messageModel: Model<Conversation>,
  ) {}

  async handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket}`);
    // TODO: Handle connection event
    this.server.emit('user-status', `${socket.id} connected successfully!`);
  }

  async handleDisconnect(socket: Socket) {
    console.log(`Client disconnected: ${socket}`);
    // TODO: Handle disconnect event
    this.server.emit('user-status', `${socket.id} disconnected!`);
  }

  // TODO: Handle who receives the message
  // @UseGuards(JwtGuard, WebSocketPermissionsGuard)
  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { message: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Parse data and get recieverID and sender info
    this.server.emit('message', data);
  }
}
