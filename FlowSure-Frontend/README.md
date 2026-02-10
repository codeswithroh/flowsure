# FlowSure Frontend

A dashboard for FlowSure - Transaction Protection on Flow Blockchain.

## Features

- **Dashboard**: Monitor active protections, retry queue, claims, and vault stats
- **Scheduled Transaction**: Schedule transactions to any particular date and time, user can also schedule recurring payments as well
- **FLOW Staking**: Stake FLOW tokens to unlock insurance discounts and earn rewards
- **Dapper Protection**: Protect your valuable Dapper NFTs (NBA Top Shot, NFL All Day, Disney Pinnacle)
- **Insure Transaction**: Wrap transactions with automatic retry protection

## Tech Stack

- **Framework**: Next.js 14 + TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Blockchain**: @onflow/fcl
- **State Management**: Zustand + React Query
- **Animation**: Framer Motion
- **API Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

  Edit `.env.local` with your configuration:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3000/api
  NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
  # WalletConnect (optional for mobile wallets)
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

  # Contract addresses (Testnet)
  NEXT_PUBLIC_FROTH_REWARDS_ADDRESS=0x8401ed4fc6788c8a
  NEXT_PUBLIC_FROTH_REWARDS_V2_ADDRESS=0x8401ed4fc6788c8a
  NEXT_PUBLIC_AUTO_COMPOUND_ADDRESS=0x8401ed4fc6788c8a
  NEXT_PUBLIC_SCHEDULER_ADDRESS=0x8401ed4fc6788c8a
  NEXT_PUBLIC_DAPPER_PROTECTION_ADDRESS=0x8401ed4fc6788c8a
  ```

#### Deployed Contracts (Testnet)
- **InsuranceVault**: `0x8401ed4fc6788c8a`
- **Scheduler**: `0x8401ed4fc6788c8a`
- **FrothRewardsV2**: `0x8401ed4fc6788c8a`
- **DapperAssetProtection**: `0x8401ed4fc6788c8a`
- **InsuredAction**: `0x8401ed4fc6788c8a`
- **ScheduledTransfer**: `0xfe1ad3a05230e532`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard
│   ├── froth/             # FROTH Staking page
│   ├── dapper/            # Dapper Protection page
│   └── insure/            # Insure Transaction page
├── components/
│   ├── pages/             # Page components
│   ├── ui/                # shadcn/ui components
│   ├── navigation.tsx     # Main navigation
│   ├── main-layout.tsx    # Layout wrapper
│   └── flo-mascot.tsx     # Flo mascot component
├── lib/
│   ├── flow-config.ts     # Flow blockchain configuration
│   ├── api-client.ts      # API client with endpoints
│   └── utils.ts           # Utility functions
└── store/
    ├── wallet-store.ts    # Wallet state management
    └── mascot-store.ts    # Mascot state management
```

## Pages

### Dashboard (`/`)
- Active protections list
- Retry queue with countdown timers
- Claims/compensations history
- Vault overview stats

### FLOW Staking (`/flow`)
- Stake/unstake FLOW tokens
- View rewards and discount tier
- Leaderboard of top stakers
- Real-time FLOW price

### Dapper Protection (`/dapper`)
- Connect Dapper wallet
- NFT grid (NBA Top Shot, NFL All Day, Disney Pinnacle)
- Toggle protection per NFT
- Protection history

### Insure Transaction (`/insure`)
- Action type selector (Swap/Mint/Transfer)
- Insurance parameters form
- Fee calculator with FROTH discount
- Execute protected transaction

## Build & Deploy

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

### Deploy to Vercel:
```bash
vercel deploy
```

## Development Notes

- Mock data is used for demonstration until backend is connected
- All API calls are ready to be connected to the backend
- Flow blockchain integration is configured for testnet
- Responsive design works on mobile, tablet, and desktop

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

