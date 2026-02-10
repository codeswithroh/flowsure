import * as fcl from '@onflow/fcl';

fcl.config({
  'accessNode.api': process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
  'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  'app.detail.title': 'FlowSure',
  'app.detail.icon': 'https://flowsure.app/logo.png',
  '0xFrothRewards': process.env.NEXT_PUBLIC_FROTH_REWARDS_ADDRESS || '0x8401ed4fc6788c8a',
  '0xFrothRewardsV2': process.env.NEXT_PUBLIC_FROTH_REWARDS_V2_ADDRESS || '0x8401ed4fc6788c8a',
  '0xAutoCompound': process.env.NEXT_PUBLIC_AUTO_COMPOUND_ADDRESS || '0x8401ed4fc6788c8a',
  '0xScheduler': process.env.NEXT_PUBLIC_SCHEDULER_ADDRESS || '0x8401ed4fc6788c8a',
  '0xDapperProtection': process.env.NEXT_PUBLIC_DAPPER_PROTECTION_ADDRESS || '0x8401ed4fc6788c8a',
  '0xFungibleToken': '0x9a0766d93b6608b7',
  '0xFlowToken': '0x7e60df042a9c0868',
});

export { fcl };
