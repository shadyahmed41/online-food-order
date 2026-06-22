import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Default Admin & User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@food.com',
      password: adminPassword,
      name: 'Admin Manager',
      role: 'ADMIN',
      phone: '+123456789',
      address: 'Admin HQ, Street 1',
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      email: 'user@food.com',
      password: userPassword,
      name: 'John Doe',
      role: 'USER',
      phone: '+987654321',
      address: 'Main Street, Apartment 4B',
    },
  });

  console.log('Seeded users:', { admin: admin.email, user: normalUser.email });

  // 3. Create Categories
  const catPizza = await prisma.category.create({
    data: { nameEn: 'Pizza', nameAr: 'بيتزا' },
  });

  const catBurgers = await prisma.category.create({
    data: { nameEn: 'Burgers', nameAr: 'برجر' },
  });

  const catDrinks = await prisma.category.create({
    data: { nameEn: 'Drinks', nameAr: 'مشروبات' },
  });

  const catDesserts = await prisma.category.create({
    data: { nameEn: 'Desserts', nameAr: 'حلويات' },
  });

  console.log('Seeded categories successfully');

  // 4. Create Products
  await prisma.product.createMany({
    data: [
      {
        nameEn: 'Margherita Pizza',
        nameAr: 'بيتزا مارغريتا',
        descriptionEn: 'Classic tomato sauce, fresh mozzarella cheese, and basil leaves on hand-tossed crust.',
        descriptionAr: 'صلصة الطماطم الكلاسيكية، جبنة الموزاريلا الطازجة، وأوراق الريحان على عجينة مفرودة يدوياً.',
        price: 10.99,
        imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=600&q=80',
        categoryId: catPizza.id,
        isAvailable: true,
      },
      {
        nameEn: 'Pepperoni Pizza',
        nameAr: 'بيتزا بيبيروني',
        descriptionEn: 'Loaded with spicy pepperoni slices, melting mozzarella, and rich marinara sauce.',
        descriptionAr: 'محملة بشرائح البيبيروني الحارة، جبن الموزاريلا الذائب، وصلصة المارينارا الغنية.',
        price: 12.99,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
        categoryId: catPizza.id,
        isAvailable: true,
      },
      {
        nameEn: 'Classic Cheeseburger',
        nameAr: 'تشيز برجر كلاسيك',
        descriptionEn: 'Flame-grilled beef patty, melted cheddar, crisp lettuce, tomato, pickles, and signature house sauce.',
        descriptionAr: 'شريحة لحم بقري مشوية على اللهب، جبن شيدر ذائب، خس مقرمش، طماطم، مخلل، وصلصة الدار المميزة.',
        price: 8.49,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categoryId: catBurgers.id,
        isAvailable: true,
      },
      {
        nameEn: 'Crispy Chicken Burger',
        nameAr: 'برجر دجاج مقرمش',
        descriptionEn: 'Crispy breaded chicken breast, spicy mayo, pickles, and shredded lettuce in a brioche bun.',
        descriptionAr: 'صدر دجاج مقرمش مغطى بالبقسماط، مايونيز حار، مخلل، وخس مبشور في خبز البريوش.',
        price: 9.29,
        imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
        categoryId: catBurgers.id,
        isAvailable: true,
      },
      {
        nameEn: 'Fresh Lemon Mint',
        nameAr: 'ليمون بالنعناع طازج',
        descriptionEn: 'Ice-blended fresh lemon juice with cooling mint leaves and sweet syrup.',
        descriptionAr: 'عصير الليمون الطازج المخفوق مع الثلج، أوراق النعناع المنعشة، والقطر المحلى.',
        price: 3.99,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        categoryId: catDrinks.id,
        isAvailable: true,
      },
      {
        nameEn: 'Chocolate Fudge Cake',
        nameAr: 'كيكة الشوكولاتة الداكنة',
        descriptionEn: 'Decadent multi-layered chocolate cake filled and frosted with dark chocolate fudge.',
        descriptionAr: 'كيكة شوكولاتة غنية متعددة الطبقات محشوة ومغطاة بكريمة الشوكولاتة الداكنة.',
        price: 5.99,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        categoryId: catDesserts.id,
        isAvailable: true,
      },
    ],
  });

  console.log('Seeded products catalog successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
