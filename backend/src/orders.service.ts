import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
  ) {}

  async createOrder(
    userId: string,
    data: {
      paymentMethod: 'COD' | 'ONLINE';
      address: string;
      phone: string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    if (!data.items || data.items.length === 0) {
      throw new Error('No items in the order');
    }

    // Resolve prices in database
    let total = 0;
    const resolvedItems: Array<{ productId: string; quantity: number; price: number }> = [];

    for (const item of data.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (!product.isAvailable) {
        throw new Error(`Product ${product.nameEn} is not available`);
      }
      const itemPrice = product.price;
      const subtotal = itemPrice * item.quantity;
      total += subtotal;

      resolvedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
      });
    }

    // Set payment status based on payment method
    const paymentStatus = data.paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING';

    // Save in database using a Prisma transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          paymentMethod: data.paymentMethod,
          paymentStatus,
          address: data.address,
          phone: data.phone,
          status: 'PENDING',
        },
      });

      for (const item of resolvedItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }

      return newOrder;
    });

    // Fetch complete order details
    const savedOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Notify sockets that a new order is pending (optional, mostly for tracking updates)
    this.ordersGateway.sendStatusUpdate(order.id, 'PENDING');

    return savedOrder;
  }

  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminOrders() {
    return this.prisma.order.findMany({
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const dataToUpdate: any = { status };
    if (status === 'DELIVERED') {
      dataToUpdate.paymentStatus = 'PAID';
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: dataToUpdate,
    });

    // Push real-time status update to socket connections!
    this.ordersGateway.sendStatusUpdate(id, status);

    return updated;
  }
}
