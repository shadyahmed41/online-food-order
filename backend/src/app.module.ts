import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { ProductsService } from './products.service';
import { OrdersService } from './orders.service';
import { AuthController } from './auth.controller';
import { ProductsController } from './products.controller';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [],
  controllers: [
    AppController,
    AuthController,
    ProductsController,
    OrdersController,
  ],
  providers: [
    AppService,
    PrismaService,
    AuthService,
    ProductsService,
    OrdersService,
    OrdersGateway,
  ],
})
export class AppModule {}

