import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard, RolesGuard, Roles } from './auth.guard';
import { GetUser } from './user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @GetUser('id') userId: string,
    @Body()
    body: {
      paymentMethod: 'COD' | 'ONLINE';
      address: string;
      phone: string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    return this.ordersService.createOrder(userId, body);
  }

  @Get()
  async getOrders(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    if (role === 'ADMIN') {
      return this.ordersService.getAdminOrders();
    }
    return this.ordersService.getUserOrders(userId);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.ordersService.getOrderById(id, userId, role);
  }

  @Put(':id/status')
  @Roles('ADMIN')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateOrderStatus(id, body.status);
  }
}
