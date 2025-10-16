import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedPackagingUnits = async () => {
  try {
    console.log('🌱 Seeding packaging units...');

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
    ];

    let createdCount = 0;

    for (const unit of defaultUnits) {
      try {
        const existingUnit = await prisma.packagingUnit.findUnique({
          where: { name: unit.name },
        });

        if (!existingUnit) {
          await prisma.packagingUnit.create({ data: unit });
          createdCount++;
          console.log(`✅ Created: ${unit.name} (${unit.abbreviation})`);
        } else {
          console.log(`⏭️  Skipped: ${unit.name} (already exists)`);
        }
      } catch (error) {
        console.log(`❌ Error creating ${unit.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Packaging units seeding completed!`);
    console.log(`📊 Created: ${createdCount} new units`);
    console.log(`📊 Total units: ${defaultUnits.length}`);
  } catch (error) {
    console.error('❌ Error seeding packaging units:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedPackagingUnits();
