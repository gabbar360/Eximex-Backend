import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedPackagingUnits = async () => {
  const defaultUnits = [
    { name: 'Square Meter', abbreviation: 'sqm', description: 'Square meter measurement' },
    { name: 'Square Feet', abbreviation: 'sqft', description: 'Square feet measurement' },
    { name: 'Square Yard', abbreviation: 'sqyd', description: 'Square yard measurement' },
    { name: 'Acre', abbreviation: 'acre', description: 'Acre measurement' },
    { name: 'Hectare', abbreviation: 'hectare', description: 'Hectare measurement' },
    { name: 'Millimeter', abbreviation: 'mm', description: 'Length in millimeters' },
    { name: 'Centimeter', abbreviation: 'cm', description: 'Length in centimeters' },
    { name: 'Meter', abbreviation: 'm', description: 'Length in meters' },
    { name: 'Kilometer', abbreviation: 'km', description: 'Length in kilometers' },
    { name: 'Inch', abbreviation: 'inch', description: 'Length in inches' },
    { name: 'Foot', abbreviation: 'ft', description: 'Length in feet' },
    { name: 'Yard', abbreviation: 'yd', description: 'Length in yards' },
    { name: 'Mile', abbreviation: 'mile', description: 'Length in miles' },
    { name: 'Milligram', abbreviation: 'mg', description: 'Weight in milligrams' },
    { name: 'Gram', abbreviation: 'g', description: 'Weight in grams' },
    { name: 'Kilogram', abbreviation: 'kg', description: 'Weight in kilograms' },
    { name: 'Metric Ton', abbreviation: 'mt', description: 'Weight in metric tons' },
    { name: 'Pound', abbreviation: 'lb', description: 'Weight in pounds' },
    { name: 'Ounce', abbreviation: 'oz', description: 'Weight in ounces' },
    { name: 'Milliliter', abbreviation: 'ml', description: 'Volume in milliliters' },
    { name: 'Liter', abbreviation: 'ltr', description: 'Volume in liters' },
    { name: 'Gallon', abbreviation: 'gal', description: 'Volume in gallons' },
    { name: 'Cubic Feet', abbreviation: 'cuft', description: 'Volume in cubic feet' },
    { name: 'Cubic Meter', abbreviation: 'cum', description: 'Volume in cubic meters' },
    { name: 'Pieces', abbreviation: 'pcs', description: 'Individual pieces' },
    { name: 'Dozen', abbreviation: 'dozen', description: 'Dozen units' },
    { name: 'Pack', abbreviation: 'pack', description: 'Pack units' },
    { name: 'Box', abbreviation: 'box', description: 'Box units' },
    { name: 'Set', abbreviation: 'set', description: 'Set units' },
    { name: 'Unit', abbreviation: 'unit', description: 'Generic unit' },
    { name: 'Carton', abbreviation: 'carton', description: 'Carton packaging' },
    { name: 'Bundle', abbreviation: 'bundle', description: 'Bundle packaging' },
    { name: 'Pallet', abbreviation: 'pallet', description: 'Pallet packaging' },
    { name: 'Bag', abbreviation: 'bag', description: 'Bag packaging' }
  ];

  for (const unit of defaultUnits) {
    const existing = await prisma.packagingUnit.findUnique({
      where: { name: unit.name },
    });
    if (!existing) {
      await prisma.packagingUnit.create({ data: unit });
      console.log(`✅ Created: ${unit.name}`);
    }
  }
};

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: 'SUPER_ADMIN',
    },
  });

  if (existingSuperAdmin) {
    console.log('✅ Super Admin already exists:', existingSuperAdmin.email);
    // Still seed packaging units even if admin exists
    console.log('\n🌱 Seeding packaging units...');
    await seedPackagingUnits();
    console.log('\n🎉 Database seeding completed!');
    return;
  }

  // Create Super Admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Administrator',
      email: 'admin@eximex.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  console.log('✅ Super Admin created successfully:');
  console.log('📧 Email:', superAdmin.email);
  console.log('🔑 Password: admin123');
  console.log('👤 Role:', superAdmin.role);
  console.log('📅 Created:', superAdmin.createdAt);

  // Seed packaging units
  console.log('\n🌱 Seeding packaging units...');
  await seedPackagingUnits();

  console.log('\n🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
