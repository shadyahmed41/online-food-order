import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard, RolesGuard, Roles, Public } from './auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // Public access endpoints (will bypass JWT check if route is marked public, or we just configure them or handle it in Guard)
  // Wait, in JwtAuthGuard we had IS_PUBLIC_KEY decorator. Let's make sure we import Public from auth.guard.
  // And apply @Public() to the read-only endpoints.
  
  @Get('categories')
  @Public()
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Get()
  @Public()
  async getProducts() {
    return this.productsService.getProducts();
  }

  @Get(':id')
  @Public()
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  // Admin access endpoints
  @Post('categories')
  @Roles('ADMIN')
  async createCategory(@Body() body: { nameEn: string; nameAr: string }) {
    return this.productsService.createCategory(body);
  }

  @Put('categories/:id')
  @Roles('ADMIN')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { nameEn?: string; nameAr?: string },
  ) {
    return this.productsService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @Roles('ADMIN')
  async deleteCategory(@Param('id') id: string) {
    return this.productsService.deleteCategory(id);
  }

  @Post()
  @Roles('ADMIN')
  async createProduct(
    @Body()
    body: {
      nameEn: string;
      nameAr: string;
      descriptionEn: string;
      descriptionAr: string;
      price: number;
      imageUrl: string;
      categoryId: string;
      isAvailable?: boolean;
    },
  ) {
    return this.productsService.createProduct(body);
  }

  @Put(':id')
  @Roles('ADMIN')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      nameEn?: string;
      nameAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      price?: number;
      imageUrl?: string;
      categoryId?: string;
      isAvailable?: boolean;
    },
  ) {
    return this.productsService.updateProduct(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}
