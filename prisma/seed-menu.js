import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuItems = [
  { name: 'Dashboard', slug: 'dashboard', path: '/dashboard', icon: 'MdDashboard', sortOrder: 1 },
  { name: 'Customer & Prospect', slug: 'customer-prospect', path: '/cprospect', icon: 'MdPeople', sortOrder: 2 },
  { name: 'Categories', slug: 'categories', path: '/categories', icon: 'MdCategory', sortOrder: 3 },
  { name: 'Products', slug: 'products', path: '/products', icon: 'MdInventory', sortOrder: 4 },
  { name: 'Proforma Invoices', slug: 'proforma-invoices', path: '/proforma-invoices', icon: 'HiOutlineDocumentText', sortOrder: 5 },
  { name: 'Orders', slug: 'orders', path: '/orders', icon: 'MdShoppingCart', sortOrder: 6 },
  { name: 'Purchase Orders', slug: 'purchase-orders', path: '/purchase-orders', icon: 'HiOutlineClipboardDocumentList', sortOrder: 7 },
  { name: 'Staff Management', slug: 'staff-management', path: '/staff-management', icon: 'MdSupervisorAccount', sortOrder: 8 },
  { name: 'Activity Logs', slug: 'activity-logs', path: '/activity-logs', icon: 'MdAnalytics', sortOrder: 9 },
  { name: 'User Profile', slug: 'user-profile', path: '/profile', icon: 'MdAccountCircle', sortOrder: 10 }
];

async function seedMenuItems() {
  console.log('Seeding menu items...');
  
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: item,
      create: item
    });
  }
  
  console.log('Menu items seeded successfully');
}

seedMenuItems()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });