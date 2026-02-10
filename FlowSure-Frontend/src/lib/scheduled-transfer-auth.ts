import * as fcl from '@onflow/fcl';

/**
 * Initialize the scheduled transfer handler for a user
 * This must be called once before scheduling any transfers
 * Uses Flow's native FlowTransactionScheduler
 */
export const initializeScheduledTransferHandler = async (): Promise<string> => {
  const transaction = `
    import ScheduledTransfer from 0xfe1ad3a05230e532
    import FlowToken from 0x7e60df042a9c0868
    import FungibleToken from 0x9a0766d93b6608b7
    import FlowTransactionScheduler from 0x8c5303eaa26202d6

    transaction {
      prepare(signer: auth(Storage, Capabilities) &Account) {
        // Remove old handler if it exists
        if signer.storage.borrow<&AnyResource>(from: ScheduledTransfer.HandlerStoragePath) != nil {
          log("Removing old handler")
          
          // Unpublish the old capability
          signer.capabilities.unpublish(ScheduledTransfer.HandlerPublicPath)
          
          // Revoke all capabilities for the old handler
          let controllers = signer.capabilities.storage.getControllers(forPath: ScheduledTransfer.HandlerStoragePath)
          for controller in controllers {
            controller.delete()
          }
          
          // Load and destroy the old handler
          let oldHandler <- signer.storage.load<@AnyResource>(from: ScheduledTransfer.HandlerStoragePath)
          destroy oldHandler
        }

        // Clean up any old vault capabilities and issue a fresh one
        let vaultControllers = signer.capabilities.storage.getControllers(forPath: /storage/flowTokenVault)
        for controller in vaultControllers {
          // Only delete capabilities that match our handler's type
          if controller.capability.getType() == Type<auth(FungibleToken.Withdraw) &FlowToken.Vault>() {
            let capId = controller.capabilityID
            // Check if this capability is not being used elsewhere before deleting
            // For now, we'll create a new one and let the old ones remain
          }
        }
        
        // Issue a fresh vault capability for the new handler
        let vaultCap = signer.capabilities.storage
          .issue<auth(FungibleToken.Withdraw) &FlowToken.Vault>(/storage/flowTokenVault)

        // Create the handler with vault capability
        let handler <- ScheduledTransfer.createHandler(
          vaultCapability: vaultCap,
          userAddress: signer.address
        )
        
        // Save to storage
        signer.storage.save(<-handler, to: ScheduledTransfer.HandlerStoragePath)
        
        // Issue authorized capability for the handler (stored privately, not published)
        let handlerCap = signer.capabilities.storage
          .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(
            ScheduledTransfer.HandlerStoragePath
          )
        
        // Issue non-authorized public capability
        let publicHandlerCap = signer.capabilities.storage
          .issue<&{FlowTransactionScheduler.TransactionHandler}>(
            ScheduledTransfer.HandlerStoragePath
          )
        
        // Publish the non-authorized capability
        signer.capabilities.publish(publicHandlerCap, at: ScheduledTransfer.HandlerPublicPath)
        
        log("Scheduled transfer handler initialized")
      }
    }
  `;

  try {
    const transactionId = await fcl.mutate({
      cadence: transaction,
      args: () => [],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser],
      limit: 9999
    });

    await fcl.tx(transactionId).onceSealed();
    return transactionId;
  } catch (error: any) {
    console.error('Handler initialization failed:', error);
    throw new Error(error.message || 'Failed to initialize scheduled transfer handler');
  }
};

/**
 * Schedule a transfer to execute at a future time
 * User signs this transaction and pays gas fees upfront
 * Flow's blockchain will automatically execute the transfer at the scheduled time
 */
export const scheduleTransfer = async (
  recipient: string,
  amount: number,
  delaySeconds: number
): Promise<string> => {
  const transaction = `
    import ScheduledTransfer from 0xfe1ad3a05230e532
    import FlowTransactionScheduler from 0x8c5303eaa26202d6
    import FlowToken from 0x7e60df042a9c0868
    import FungibleToken from 0x9a0766d93b6608b7

    transaction(recipient: Address, amount: UFix64, delaySeconds: UFix64) {
      prepare(signer: auth(Storage, Capabilities) &Account) {
        let future = getCurrentBlock().timestamp + delaySeconds
        let priority = FlowTransactionScheduler.Priority.Medium
        let executionEffort: UInt64 = 1000
        
        // Create transfer data as a simple dictionary instead of struct
        // to work around potential Flow scheduler serialization issues
        let transferData: {String: AnyStruct} = {
          "recipient": recipient,
          "amount": amount
        }
        
        log("=== SCHEDULING TRANSFER ===")
        log("Recipient: ".concat(recipient.toString()))
        log("Amount: ".concat(amount.toString()))
        
        let estimate = FlowTransactionScheduler.estimate(
          data: transferData,
          timestamp: future,
          priority: priority,
          executionEffort: executionEffort
        )
        
        assert(
          estimate.timestamp != nil || priority == FlowTransactionScheduler.Priority.Low,
          message: estimate.error ?? "estimation failed"
        )
        
        let vaultRef = signer.storage
          .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
          ?? panic("Could not borrow FlowToken vault")
        let fees <- vaultRef.withdraw(amount: estimate.flowFee ?? 0.0) as! @FlowToken.Vault
        
        var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil
        
        let controllers = signer.capabilities.storage.getControllers(forPath: ScheduledTransfer.HandlerStoragePath)
        
        for controller in controllers {
          if let cap = controller.capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
            handlerCap = cap
            break
          }
        }
        
        assert(handlerCap != nil, message: "Could not get handler capability")
        
        log("=== ABOUT TO SCHEDULE ===")
        log("Recipient: ".concat(recipient.toString()))
        log("Amount: ".concat(amount.toString()))
        log("Fee amount: ".concat(fees.balance.toString()))
        log("Timestamp: ".concat(future.toString()))
        
        let receipt <- FlowTransactionScheduler.schedule(
          handlerCap: handlerCap!,
          data: transferData,
          timestamp: future,
          priority: priority,
          executionEffort: executionEffort,
          fees: <-fees
        )
        
        // Store or destroy the receipt
        destroy receipt
        
        log("Transfer scheduled to ".concat(recipient.toString())
          .concat(" for ").concat(amount.toString())
          .concat(" FLOW at ").concat(future.toString()))
      }
    }
  `;

  try {
    // Format UFix64 values properly - must have exactly 8 decimal places
    const formattedAmount = amount.toFixed(8);
    const formattedDelay = delaySeconds.toFixed(8);
    
    console.log('Scheduling transfer:', { recipient, amount, delaySeconds });
    console.log('Formatted amount for FCL:', formattedAmount);
    console.log('Formatted delay for FCL:', formattedDelay);
    
    const transactionId = await fcl.mutate({
      cadence: transaction,
      args: (arg, t) => [
        arg(recipient, t.Address),
        arg(formattedAmount, t.UFix64),
        arg(formattedDelay, t.UFix64)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser],
      limit: 9999
    });

    await fcl.tx(transactionId).onceSealed();
    return transactionId;
  } catch (error: any) {
    console.error('Transfer scheduling failed:', error);
    throw new Error(error.message || 'Failed to schedule transfer');
  }
};

/**
 * Check if user has initialized the scheduled transfer handler
 */
export const checkHandlerInitialized = async (userAddress: string): Promise<boolean> => {
  try {
    const script = `
      import ScheduledTransfer from 0xfe1ad3a05230e532
      
      access(all) fun main(userAddress: Address): Bool {
        let account = getAccount(userAddress)
        
        // Check if handler exists in storage
        let hasHandler = account.storage.check<@AnyResource>(from: ScheduledTransfer.HandlerStoragePath)
        
        return hasHandler
      }
    `;

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(userAddress, t.Address)]
    });

    return result as boolean;
  } catch (error) {
    console.error('Failed to check handler initialization:', error);
    return false;
  }
};

/**
 * Authorize backend to execute scheduled transfers on user's behalf
 * This creates a TransferAuthorization resource that allows the backend service account
 * to withdraw and transfer tokens up to a specified maximum amount
 */
export const authorizeBackendForTransfers = async (
  maxAmountPerTransfer: number = 10000.0
): Promise<string> => {
  const serviceAccount = process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_ADDRESS;
  
  if (!serviceAccount) {
    throw new Error('Service account address not configured');
  }

  const transaction = `
    import ScheduledTransfer from 0xfe1ad3a05230e532
    import FlowToken from 0x7e60df042a9c0868
    import FungibleToken from 0x9a0766d93b6608b7

    transaction(maxAmountPerTransfer: UFix64, serviceAccount: Address) {
      prepare(signer: auth(Storage, Capabilities) &Account) {
        // Destroy existing authorization if present
        if signer.storage.borrow<&AnyResource>(from: /storage/scheduledTransferAuth) != nil {
          let oldAuth <- signer.storage.load<@AnyResource>(from: /storage/scheduledTransferAuth)
          destroy oldAuth
        }

        // Issue withdraw capability for FlowToken vault
        let withdrawCap = signer.capabilities.storage
          .issue<auth(FungibleToken.Withdraw) &FlowToken.Vault>(/storage/flowTokenVault)
        
        // Create the authorization resource
        let authorization <- ScheduledTransfer.createAuthorization(
          withdrawCapability: withdrawCap,
          maxAmountPerTransfer: maxAmountPerTransfer,
          authorizedAccount: serviceAccount
        )
        
        // Save to storage
        signer.storage.save(<-authorization, to: /storage/scheduledTransferAuth)
        
        // Unpublish existing capability if present
        signer.capabilities.unpublish(/public/scheduledTransferAuth)
        
        // Publish a public capability so backend can access it
        let authCap = signer.capabilities.storage
          .issue<&ScheduledTransfer.TransferAuthorization>(/storage/scheduledTransferAuth)
        signer.capabilities.publish(authCap, at: /public/scheduledTransferAuth)
        
        log("Backend authorized for scheduled transfers with max amount: ".concat(maxAmountPerTransfer.toString()))
      }
    }
  `;

  try {
    const transactionId = await fcl.mutate({
      cadence: transaction,
      args: (arg, t) => [
        arg(maxAmountPerTransfer.toFixed(8), t.UFix64),
        arg(serviceAccount, t.Address)
      ],
      proposer: fcl.currentUser,
      payer: fcl.currentUser,
      authorizations: [fcl.currentUser],
      limit: 9999
    });

    await fcl.tx(transactionId).onceSealed();
    return transactionId;
  } catch (error: any) {
    console.error('Backend authorization failed:', error);
    throw new Error(error.message || 'Failed to authorize backend');
  }
};

/**
 * Check if user has authorized backend for scheduled transfers
 */
export const checkBackendAuthorization = async (userAddress: string): Promise<{
  isAuthorized: boolean;
  maxAmountPerTransfer: number;
  authorizedAccount: string | null;
  isRevoked: boolean;
}> => {
  try {
    const script = `
      import ScheduledTransfer from 0xfe1ad3a05230e532
      
      access(all) fun main(userAddress: Address): {String: AnyStruct} {
        let userAccount = getAccount(userAddress)
        
        if let authCap = userAccount.capabilities
          .get<&ScheduledTransfer.TransferAuthorization>(/public/scheduledTransferAuth)
          .borrow() {
          
          return {
            "isAuthorized": true,
            "maxAmountPerTransfer": authCap.maxAmountPerTransfer,
            "authorizedAccount": authCap.authorizedAccount,
            "isRevoked": authCap.isRevoked
          }
        }
        
        return {
          "isAuthorized": false,
          "maxAmountPerTransfer": 0.0,
          "authorizedAccount": nil,
          "isRevoked": false
        }
      }
    `;

    const result = await fcl.query({
      cadence: script,
      args: (arg, t) => [arg(userAddress, t.Address)]
    });

    return {
      isAuthorized: result.isAuthorized as boolean,
      maxAmountPerTransfer: result.maxAmountPerTransfer as number,
      authorizedAccount: result.authorizedAccount as string | null,
      isRevoked: result.isRevoked as boolean
    };
  } catch (error) {
    console.error('Failed to check backend authorization:', error);
    return {
      isAuthorized: false,
      maxAmountPerTransfer: 0,
      authorizedAccount: null,
      isRevoked: false
    };
  }
};

// Backwards compatibility alias
export const checkAuthorization = checkHandlerInitialized;
