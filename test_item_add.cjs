const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testItemAdd() {
  try {
    const objectId = '6ab22495ac088069004796f2';

    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { id: objectId },
          { clerkId: 'custom_1790059669492_prvivn' },
          { email: 'vikasvikas9095@gmail.com' }
        ]
      },
    });

    if (!user) {
      console.log("User not found");
      return;
    }

    const businessProfile = await prisma.businessProfile.findFirst({
      where: { userId: user.clerkId || user.id },
    });

    if (!businessProfile) {
      console.log("Business profile not found");
      return;
    }

    console.log("Before: serialCounter =", businessProfile.serialCounter, "enableSerialNumber =", businessProfile.enableSerialNumber);

    let inventoryCode = null;
    let sellingPrice = 999;

    if (businessProfile?.enableSerialNumber) {
      // 1. Atomically increment the counter to ensure concurrency safety
      const updatedProfile = await prisma.businessProfile.update({
        where: { id: businessProfile.id },
        data: {
          serialCounter: { increment: 1 }
        },
        select: { serialCounter: true }
      });
      
      let baseNumber = updatedProfile.serialCounter - 1;

      // 2. Format the code: [First 2 digits of base] + [Selling Price] + [Remaining digits of base]
      const baseStr = baseNumber.toString();
      const prefix = baseStr.substring(0, 2);
      const suffix = baseStr.substring(2);
      inventoryCode = `${prefix}${sellingPrice}${suffix}`;
      console.log(`Generated logic code: Base: ${baseNumber}, Price: ${sellingPrice}, Code: ${inventoryCode}`);
    } else {
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timePart = Date.now().toString().slice(-4);
      inventoryCode = `ITM-${timePart}-${randomStr}`;
      console.log(`Generated fallback code: ${inventoryCode}`);
    }

    // Attempt to create a dummy item
    const dummyItem = await prisma.item.create({
      data: {
        name: "Test Item from Script",
        price: 999,
        sellingPrice: 999,
        clerkId: user.clerkId || '',
        userId: user.id,
        inventoryCode: inventoryCode
      }
    });

    console.log("Successfully created item:", dummyItem);
    
    // Clean up
    await prisma.item.delete({ where: { id: dummyItem.id } });
    console.log("Deleted test item.");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testItemAdd();
