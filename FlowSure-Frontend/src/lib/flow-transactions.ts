import { fcl } from './flow-config';

export const executeTransfer = async (
  recipient: string,
  amount: number
) => {
  const transactionCode = `
    import FungibleToken from 0x9a0766d93b6608b7
    import FlowToken from 0x7e60df042a9c0868
    
    transaction(recipient: Address, amount: UFix64) {
      let sentVault: @{FungibleToken.Vault}
      
      prepare(signer: auth(BorrowValue) &Account) {
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
          from: /storage/flowTokenVault
        ) ?? panic("Could not borrow reference to the owner's Vault")
        
        self.sentVault <- vaultRef.withdraw(amount: amount)
      }
      
      execute {
        let receiverRef = getAccount(recipient)
          .capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
          ?? panic("Could not borrow receiver reference")
        
        receiverRef.deposit(from: <-self.sentVault)
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: (arg, t) => [
      arg(recipient, t.Address),
      arg(amount.toFixed(8), t.UFix64)
    ],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  const transaction = await fcl.tx(transactionId).onceSealed();
  
  const status = transaction.statusCode === 0 ? 'SUCCESS' : 'FAILED';
  
  return {
    transactionId,
    transaction,
    status
  };
};

export const executeInsuredAction = async (
  actionType: string,
  amount: number,
  recipient: string,
  retryLimit: number
) => {
  if (actionType === 'transfer') {
    return await executeTransfer(recipient, amount);
  }
  
  const contractAddress = process.env.NEXT_PUBLIC_INSURED_ACTION_ADDRESS || '0x8401ed4fc6788c8a';
  const transactionCode = `
    import InsuredAction from ${contractAddress}
    
    transaction(
      targetAction: String,
      shouldFail: Bool,
      retryLimit: UInt8
    ) {
      let actionManagerRef: &InsuredAction.ActionManager
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.actionManagerRef = InsuredAction.borrowActionManager()
      }
      
      execute {
        let params: {String: AnyStruct} = {
          "shouldFail": shouldFail,
          "amount": "${amount}",
          "recipient": "${recipient}"
        }
        
        let actionId = self.actionManagerRef.insuredAction(
          user: self.actionManagerRef.owner!.address,
          targetAction: targetAction,
          params: params,
          retryLimit: retryLimit
        )
        
        log("Action executed with ID: ".concat(actionId))
      }
    }
  `;

  const transactionId = await fcl.mutate({
    cadence: transactionCode,
    args: (arg, t) => [
      arg(actionType, t.String),
      arg(false, t.Bool),
      arg(retryLimit.toString(), t.UInt8)
    ],
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    authorizations: [fcl.currentUser],
    limit: 9999
  });

  const transaction = await fcl.tx(transactionId).onceSealed();
  
  const status = transaction.statusCode === 0 ? 'SUCCESS' : 'FAILED';
  
  return {
    transactionId,
    transaction,
    status
  };
};

export const stakeTokens = async (amount: number) => {
  const contractAddress = process.env.NEXT_PUBLIC_FROTH_REWARDS_ADDRESS || '0x8401ed4fc6788c8a';
  const transactionCode = `
    import FrothRewards from ${contractAddress}
    
    transaction(amount: UFix64) {
      let stakerRef: &FrothRewards.FrothStaker
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.stakerRef = signer.storage.borrow<&FrothRewards.FrothStaker>(
          from: FrothRewards.StakerStoragePath
        ) ?? panic("No staker found")
      }
      
      execute {
        self.stakerRef.stake(amount: amount)
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

export const unstakeTokens = async (amount: number) => {
  const contractAddress = process.env.NEXT_PUBLIC_FROTH_REWARDS_ADDRESS || '0x8401ed4fc6788c8a';
  const transactionCode = `
    import FrothRewards from ${contractAddress}
    
    transaction(amount: UFix64) {
      let stakerRef: &FrothRewards.FrothStaker
      
      prepare(signer: auth(BorrowValue) &Account) {
        self.stakerRef = signer.storage.borrow<&FrothRewards.FrothStaker>(
          from: FrothRewards.StakerStoragePath
        ) ?? panic("No staker found")
      }
      
      execute {
        self.stakerRef.unstake(amount: amount)
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
