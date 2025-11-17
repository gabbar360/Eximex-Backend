import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedMenuItems = async () => {
  const menuItems = [
    { name: 'Dashboard', slug: 'dashboard', path: '/dashboard', icon: 'MdDashboard', sortOrder: 1, isActive: true },
    { name: 'Customer&prospect', slug: 'customer-prospect', path: '/cprospect', icon: 'MdPeople', sortOrder: 2, isActive: true },
    { name: 'Categories', slug: 'categories', path: '/categories', icon: 'MdCategory', sortOrder: 3, isActive: true },
    { name: 'Products', slug: 'products', path: '/products', icon: 'MdInventory', sortOrder: 4, isActive: true },
    { name: 'Proforma Invoices', slug: 'proforma-invoices', path: '/proforma-invoices', icon: 'HiOutlineDocumentText', sortOrder: 5, isActive: true },
    { name: 'Orders', slug: 'orders', path: null, icon: 'MdShoppingCart', sortOrder: 6, isActive: true },
    { name: 'Purchase Orders', slug: 'purchase-orders', path: '/purchase-orders', icon: 'HiOutlineClipboardDocumentList', sortOrder: 7, isActive: true },
    { name: 'Staff Management', slug: 'staff-management', path: '/staff-management', icon: 'MdSupervisorAccount', sortOrder: 8, isActive: true },

    { name: 'User Profile', slug: 'user-profile', path: '/profile', icon: 'MdAccountCircle', sortOrder: 10, isActive: true }
    { name: 'User Profile', slug: 'user-profile', path: '/profile', icon: 'MdAccountCircle', sortOrder: 8, isActive: true }
  ];

  // Create parent menu items first
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: item,
      create: item
    });
    console.log(`✅ Menu: ${item.name}`);
  }

  // Get Orders parent menu item
  const ordersMenu = await prisma.menuItem.findUnique({
    where: { slug: 'orders' }
  });

  // Create sub menu items for Orders
  if (ordersMenu) {
    const subMenuItems = [
      { name: 'All Orders', slug: 'all-orders', path: '/orders', parentId: ordersMenu.id, sortOrder: 1, isActive: true },
      { name: 'Shipments', slug: 'shipments', path: '/orders/shipments', parentId: ordersMenu.id, sortOrder: 2, isActive: true },
      { name: 'Packing Lists', slug: 'packing-lists', path: '/orders/packing-lists', parentId: ordersMenu.id, sortOrder: 3, isActive: true },
      { name: 'VGM Documents', slug: 'vgm-documents', path: '/orders/vgm', parentId: ordersMenu.id, sortOrder: 4, isActive: true },
      { name: 'Reports', slug: 'reports', path: '/orders/reports', parentId: ordersMenu.id, sortOrder: 5, isActive: true }
    ];

    for (const subItem of subMenuItems) {
      await prisma.menuItem.upsert({
        where: { slug: subItem.slug },
        update: subItem,
        create: subItem
      });
      console.log(`✅ SubMenu: ${subItem.name}`);
    }
  }
};

const seedPackagingUnits = async () => {
  const defaultUnits = [
    {
      name: 'Square Meter',
      abbreviation: 'sqm',
      description: 'Square meter measurement',
    },
    {
      name: 'Square Feet',
      abbreviation: 'sqft',
      description: 'Square feet measurement',
    },
    {
      name: 'Square Yard',
      abbreviation: 'sqyd',
      description: 'Square yard measurement',
    },
    { name: 'Acre', abbreviation: 'acre', description: 'Acre measurement' },
    {
      name: 'Hectare',
      abbreviation: 'hectare',
      description: 'Hectare measurement',
    },
    {
      name: 'Millimeter',
      abbreviation: 'mm',
      description: 'Length in millimeters',
    },
    {
      name: 'Centimeter',
      abbreviation: 'cm',
      description: 'Length in centimeters',
    },
    { name: 'Meter', abbreviation: 'm', description: 'Length in meters' },
    {
      name: 'Kilometer',
      abbreviation: 'km',
      description: 'Length in kilometers',
    },
    { name: 'Inch', abbreviation: 'inch', description: 'Length in inches' },
    { name: 'Foot', abbreviation: 'ft', description: 'Length in feet' },
    { name: 'Yard', abbreviation: 'yd', description: 'Length in yards' },
    { name: 'Mile', abbreviation: 'mile', description: 'Length in miles' },
    {
      name: 'Milligram',
      abbreviation: 'mg',
      description: 'Weight in milligrams',
    },
    { name: 'Gram', abbreviation: 'g', description: 'Weight in grams' },
    {
      name: 'Kilogram',
      abbreviation: 'kg',
      description: 'Weight in kilograms',
    },
    {
      name: 'Metric Ton',
      abbreviation: 'mt',
      description: 'Weight in metric tons',
    },
    { name: 'Pound', abbreviation: 'lb', description: 'Weight in pounds' },
    { name: 'Ounce', abbreviation: 'oz', description: 'Weight in ounces' },
    {
      name: 'Milliliter',
      abbreviation: 'ml',
      description: 'Volume in milliliters',
    },
    { name: 'Liter', abbreviation: 'ltr', description: 'Volume in liters' },
    { name: 'Gallon', abbreviation: 'gal', description: 'Volume in gallons' },
    {
      name: 'Cubic Feet',
      abbreviation: 'cuft',
      description: 'Volume in cubic feet',
    },
    {
      name: 'Cubic Meter',
      abbreviation: 'cum',
      description: 'Volume in cubic meters',
    },
    { name: 'Pieces', abbreviation: 'pcs', description: 'Individual pieces' },
    { name: 'Dozen', abbreviation: 'dozen', description: 'Dozen units' },
    { name: 'Pack', abbreviation: 'pack', description: 'Pack units' },
    { name: 'Box', abbreviation: 'box', description: 'Box units' },
    { name: 'Set', abbreviation: 'set', description: 'Set units' },
    { name: 'Unit', abbreviation: 'unit', description: 'Generic unit' },
    { name: 'Carton', abbreviation: 'carton', description: 'Carton packaging' },
    { name: 'Bundle', abbreviation: 'bundle', description: 'Bundle packaging' },
    { name: 'Pallet', abbreviation: 'pallet', description: 'Pallet packaging' },
    { name: 'Bag', abbreviation: 'bag', description: 'Bag packaging' },
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

// Sample data creation removed - using real database data

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create SUPER_ADMIN role only
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      description: 'Full system access across all companies',
      isSystem: true
    }
  });
  console.log('✅ SUPER_ADMIN role ready');

  // Check if super admin user already exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: {
      email: 'admin@eximex.com',
    },
  });

  if (!existingSuperAdmin) {
    // Create Super Admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: 'admin@eximex.com',
        password: hashedPassword,
        roleId: superAdminRole.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        status: true,
        createdAt: true,
      },
    });

    console.log('✅ Super Admin created successfully:');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Role ID:', superAdmin.roleId);
    console.log('📅 Created:', superAdmin.createdAt);
  } else {
    // Update existing user's roleId if needed
    if (!existingSuperAdmin.roleId) {
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { roleId: superAdminRole.id }
      });
      console.log('✅ Super Admin role updated for existing user');
    } else {
      console.log('✅ Super Admin already exists:', existingSuperAdmin.email);
    }
  }

  // Seed menu items
  console.log('\n🌱 Seeding menu items...');
  await seedMenuItems();

  // Seed packaging units
  console.log('\n🌱 Seeding packaging units...');
  await seedPackagingUnits();

  // Skip sample data creation - use real database data
  console.log('\n✅ Using existing database data');

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
