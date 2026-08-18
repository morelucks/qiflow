import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create demo merchant
  const passwordHash = await bcrypt.hash('password123', 12);
  const merchant = await prisma.merchant.upsert({
    where: { email: 'demo@qiflow.xyz' },
    update: {
      passwordHash,
      businessName: 'QiFlow Demo Store',
    },
    create: {
      email: 'demo@qiflow.xyz',
      passwordHash,
      businessName: 'QiFlow Demo Store',
      walletAddress: '0x00473a216f2b1d382759e612bf6029fa037e95b2',
    },
  });
  console.log(`✅ Merchant seeded: ${merchant.email} (${merchant.id})`);

  // 2. Create demo API key
  const rawApiKey = 'qiflow_test_demo1234567890abcdef12345678';
  const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: {},
    create: {
      merchantId: merchant.id,
      keyHash,
      keyPrefix: 'qiflow_test_demo',
      lastFour: '5678',
      name: 'Default Test Key',
      isActive: true,
    },
  });
  console.log(`✅ API Key seeded: qiflow_test_demo...5678`);

  // 3. Create sample payments
  const samplePayments = [
    {
      paymentCode: 'pay_demo0001',
      amount: '50.00000000',
      description: 'QiFlow T-Shirt',
      status: 'COMPLETED' as const,
      receivingAddress: '0x00473a216f2b1d382759e612bf6029fa037e95b2',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      expiresAt: new Date(Date.now() + 1800 * 1000),
      completedAt: new Date(),
    },
    {
      paymentCode: 'pay_demo0002',
      amount: '15.50000000',
      description: 'Coffee Donation',
      status: 'PENDING' as const,
      receivingAddress: '0x00473a216f2b1d382759e612bf6029fa037e95b2',
      expiresAt: new Date(Date.now() + 1800 * 1000),
    },
    {
      paymentCode: 'pay_demo0003',
      amount: '120.00000000',
      description: 'Conference Ticket',
      status: 'EXPIRED' as const,
      receivingAddress: '0x00473a216f2b1d382759e612bf6029fa037e95b2',
      expiresAt: new Date(Date.now() - 3600 * 1000),
    },
  ];

  for (const pay of samplePayments) {
    await prisma.payment.upsert({
      where: { paymentCode: pay.paymentCode },
      update: {},
      create: {
        merchantId: merchant.id,
        ...pay,
      },
    });
  }
  console.log(`✅ ${samplePayments.length} Sample payments seeded`);

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
