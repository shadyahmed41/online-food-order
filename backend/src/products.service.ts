import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  // User/Public methods
  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  async getProducts() {
    return this.prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  // Admin methods: Categories
  async createCategory(data: { nameEn: string; nameAr: string }) {
    return this.prisma.category.create({ data });
  }

  async updateCategory(id: string, data: { nameEn?: string; nameAr?: string }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    // Delete all products under category first (due to DB constraint)
    await this.prisma.product.deleteMany({ where: { categoryId: id } });

    // Delete category
    return this.prisma.category.delete({ where: { id } });
  }

  // Admin methods: Products
  async createProduct(data: {
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    isAvailable?: boolean;
  }) {
    return this.prisma.product.create({
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        price: Number(data.price),
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      },
    });
  }

  async updateProduct(
    id: string,
    data: {
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
    const updateData: any = { ...data };
    if (data.price !== undefined) {
      updateData.price = Number(data.price);
    }
    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteProduct(id: string) {
    // Delete any order items referencing this product first
    await this.prisma.orderItem.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }
}
