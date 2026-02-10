import { fcl } from './flow-config';

export const createStaker = async () => {
  const transactionCode = `
    import FrothRewardsV2 from 0xFrothRewardsV2
    
    transaction {
      prepare(signer: auth(SaveValue, BorrowValue, StorageCapabilities, Capabilities) &Account) {
        if signer.storage.borrow<&FrothRewardsV2.FrothStaker>(from: FrothRewardsV2.StakerStoragePath) != nil {
          log("Staker already exists")
          return
        }
        
        let staker <- FrothRewardsV2.createStaker()
        signer.storage.save(<-staker, to: FrothRewardsV2.StakerStoragePath)
        
        let cap = signer.capabilities.storage.issue<&FrothRewardsV2.FrothStaker>(
          FrothRewardsV2.StakerStoragePath
        )
        signer.capabilities.publish(cap, at: FrothRewardsV2.StakerPublicPath)
        
        log("FrothStaker created successfully")
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: () => [],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  return await fcl.tx(transactionId).onceSealed();
};

export const stakeFlow = async (amount: number) => {
  const transactionCode = `
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken
    import FrothRewardsV2 from 0xFrothRewardsV2
    
    transaction(amount: UFix64) {
      let stakerRef: &FrothRewardsV2.FrothStaker
      let flowVault: auth(FungibleToken.Withdraw) &FlowToken.Vault
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.stakerRef = signer.storage.borrow<&FrothRewardsV2.FrothStaker>(
          from: FrothRewardsV2.StakerStoragePath
        ) ?? panic("Could not borrow FrothStaker reference. Run create_froth_staker.cdc first")
        
        self.flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
          from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken.Vault reference")
      }
      
      execute {
        let tokens <- self.flowVault.withdraw(amount: amount)
        self.stakerRef.stake(from: <-tokens)
        log("Successfully staked ".concat(amount.toString()).concat(" FLOW"))
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: (arg, t) => [arg(amount.toFixed(8), t.UFix64)],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  return await fcl.tx(transactionId).onceSealed();
};

export const unstakeFlow = async (amount: number) => {
  const transactionCode = `
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken
    import FrothRewardsV2 from 0xFrothRewardsV2
    
    transaction(amount: UFix64) {
      let stakerRef: &FrothRewardsV2.FrothStaker
      let flowVault: &FlowToken.Vault
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.stakerRef = signer.storage.borrow<&FrothRewardsV2.FrothStaker>(
          from: FrothRewardsV2.StakerStoragePath
        ) ?? panic("Could not borrow FrothStaker reference")
        
        self.flowVault = signer.storage.borrow<&FlowToken.Vault>(
          from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken.Vault reference")
      }
      
      execute {
        let tokens <- self.stakerRef.unstake(amount: amount)
        self.flowVault.deposit(from: <-tokens)
        log("Successfully unstaked ".concat(amount.toString()).concat(" FLOW"))
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: (arg, t) => [arg(amount.toFixed(8), t.UFix64)],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  return await fcl.tx(transactionId).onceSealed();
};

export const claimRewards = async () => {
  const transactionCode = `
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken
    import FrothRewardsV2 from 0xFrothRewardsV2
    
    transaction {
      let stakerRef: &FrothRewardsV2.FrothStaker
      let flowVault: &FlowToken.Vault
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.stakerRef = signer.storage.borrow<&FrothRewardsV2.FrothStaker>(
          from: FrothRewardsV2.StakerStoragePath
        ) ?? panic("Could not borrow FrothStaker reference")
        
        self.flowVault = signer.storage.borrow<&FlowToken.Vault>(
          from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken.Vault reference")
      }
      
      execute {
        let pendingRewards = self.stakerRef.calculatePendingRewards()
        
        if pendingRewards > 0.0 {
          let rewardTokens <- self.stakerRef.claimRewards()
          self.flowVault.deposit(from: <-rewardTokens)
          log("Successfully claimed ".concat(pendingRewards.toString()).concat(" FLOW in rewards"))
        } else {
          log("No rewards available to claim")
        }
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: () => [],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  return await fcl.tx(transactionId).onceSealed();
};

export const getStakingSummary = async (address: string) => {
  const scriptCode = `
    import FrothRewardsV2 from 0xFrothRewardsV2
    
    access(all) struct StakingSummary {
      access(all) let userAddress: Address
      access(all) let stakedAmount: UFix64
      access(all) let discount: UFix64
      access(all) let pendingRewards: UFix64
      access(all) let totalStakedGlobal: UFix64
      access(all) let totalStakersGlobal: UInt64
      access(all) let annualRewardRate: UFix64
      
      init(
        userAddress: Address,
        stakedAmount: UFix64,
        discount: UFix64,
        pendingRewards: UFix64,
        totalStakedGlobal: UFix64,
        totalStakersGlobal: UInt64,
        annualRewardRate: UFix64
      ) {
        self.userAddress = userAddress
        self.stakedAmount = stakedAmount
        self.discount = discount
        self.pendingRewards = pendingRewards
        self.totalStakedGlobal = totalStakedGlobal
        self.totalStakersGlobal = totalStakersGlobal
        self.annualRewardRate = annualRewardRate
      }
    }
    
    access(all) fun main(user: Address): StakingSummary? {
      let account = getAccount(user)
      
      if let stakerRef = account.capabilities.borrow<&{FrothRewardsV2.StakerPublic}>(
        FrothRewardsV2.StakerPublicPath
      ) {
        return StakingSummary(
          userAddress: user,
          stakedAmount: stakerRef.getStakedAmount(),
          discount: stakerRef.getDiscount(),
          pendingRewards: stakerRef.calculatePendingRewards(),
          totalStakedGlobal: FrothRewardsV2.getTotalStaked(),
          totalStakersGlobal: FrothRewardsV2.getTotalStakers(),
          annualRewardRate: FrothRewardsV2.annualRewardRate
        )
      }
      
      return nil
    }
  `;

  const result = await fcl.query({
    cadence: scriptCode,
    args: (arg, t) => [arg(address, t.Address)]
  });

  return result;
};

export const getFlowBalance = async (address: string) => {
  const scriptCode = `
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken
    
    access(all) fun main(address: Address): UFix64 {
      let account = getAccount(address)
      
      if let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(/public/flowTokenBalance) {
        return vaultRef.balance
      }
      
      return 0.0
    }
  `;

  const result = await fcl.query({
    cadence: scriptCode,
    args: (arg, t) => [arg(address, t.Address)]
  });

  return parseFloat(result);
};
