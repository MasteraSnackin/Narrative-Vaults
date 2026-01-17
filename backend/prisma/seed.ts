import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { wallet_address: '0x1234567890123456789012345678901234567890' },
      update: {},
      create: {
        wallet_address: '0x1234567890123456789012345678901234567890',
        total_xp: 2500,
        current_level: 3,
        referral_code: 'ALPHA001',
      },
    }),
    prisma.user.upsert({
      where: { wallet_address: '0x2345678901234567890123456789012345678901' },
      update: {},
      create: {
        wallet_address: '0x2345678901234567890123456789012345678901',
        total_xp: 1200,
        current_level: 2,
        referral_code: 'BETA0002',
      },
    }),
    prisma.user.upsert({
      where: { wallet_address: '0x3456789012345678901234567890123456789012' },
      update: {},
      create: {
        wallet_address: '0x3456789012345678901234567890123456789012',
        total_xp: 500,
        current_level: 1,
        referral_code: 'GAMMA003',
      },
    }),
  ]);

  console.log(`Created ${users.length} test users`);

  // Create test vaults for each narrative
  const vaults = await Promise.all([
    prisma.vault.upsert({
      where: { salt_account_address: '0xsalt_sol_vs_eth_vault_address_001' },
      update: {},
      create: {
        narrative_id: 'sol-vs-eth',
        salt_account_address: '0xsalt_sol_vs_eth_vault_address_001',
        total_deposits: 50000,
        current_pnl: 2500,
        status: 'active',
      },
    }),
    prisma.vault.upsert({
      where: { salt_account_address: '0xsalt_ai_vs_memes_vault_address_02' },
      update: {},
      create: {
        narrative_id: 'ai-vs-memes',
        salt_account_address: '0xsalt_ai_vs_memes_vault_address_02',
        total_deposits: 30000,
        current_pnl: -1500,
        status: 'active',
      },
    }),
    prisma.vault.upsert({
      where: { salt_account_address: '0xsalt_defi_vs_gamefi_vault_addr03' },
      update: {},
      create: {
        narrative_id: 'defi-vs-gamefi',
        salt_account_address: '0xsalt_defi_vs_gamefi_vault_addr03',
        total_deposits: 25000,
        current_pnl: 1200,
        status: 'active',
      },
    }),
    prisma.vault.upsert({
      where: { salt_account_address: '0xsalt_l2_wars_vault_address_00004' },
      update: {},
      create: {
        narrative_id: 'l2-wars',
        salt_account_address: '0xsalt_l2_wars_vault_address_00004',
        total_deposits: 15000,
        current_pnl: 3000,
        status: 'active',
      },
    }),
    prisma.vault.upsert({
      where: { salt_account_address: '0xsalt_btc_dominance_vault_addr005' },
      update: {},
      create: {
        narrative_id: 'btc-dominance',
        salt_account_address: '0xsalt_btc_dominance_vault_addr005',
        total_deposits: 40000,
        current_pnl: 800,
        status: 'active',
      },
    }),
  ]);

  console.log(`Created ${vaults.length} test vaults`);

  // Create test vault positions
  const positions = await Promise.all([
    prisma.vaultPosition.create({
      data: {
        user_id: users[0].id,
        vault_id: vaults[0].id,
        deposit_amount: 10000,
        share_tokens: 1000,
        entry_pnl: 0,
      },
    }),
    prisma.vaultPosition.create({
      data: {
        user_id: users[0].id,
        vault_id: vaults[1].id,
        deposit_amount: 5000,
        share_tokens: 500,
        entry_pnl: 0,
      },
    }),
    prisma.vaultPosition.create({
      data: {
        user_id: users[1].id,
        vault_id: vaults[0].id,
        deposit_amount: 8000,
        share_tokens: 800,
        entry_pnl: 0,
      },
    }),
    prisma.vaultPosition.create({
      data: {
        user_id: users[2].id,
        vault_id: vaults[2].id,
        deposit_amount: 3000,
        share_tokens: 300,
        entry_pnl: 0,
      },
    }),
  ]);

  console.log(`Created ${positions.length} test vault positions`);

  // Create some XP events
  const xpEvents = await Promise.all([
    prisma.xPEvent.create({
      data: {
        user_id: users[0].id,
        vault_id: vaults[0].id,
        xp_earned: 500,
        event_type: 'vault_performance',
        description: 'Earned XP for vault profit',
      },
    }),
    prisma.xPEvent.create({
      data: {
        user_id: users[0].id,
        vault_id: vaults[0].id,
        xp_earned: 50,
        event_type: 'first_depositor_bonus',
        description: 'First depositor bonus',
      },
    }),
    prisma.xPEvent.create({
      data: {
        user_id: users[1].id,
        vault_id: vaults[0].id,
        xp_earned: 200,
        event_type: 'vault_performance',
        description: 'Earned XP for vault profit',
      },
    }),
  ]);

  console.log(`Created ${xpEvents.length} XP events`);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
