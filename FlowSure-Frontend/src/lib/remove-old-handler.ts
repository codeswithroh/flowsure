import * as fcl from '@onflow/fcl';

/**
 * Remove the old ScheduledTransfer Handler from storage
 * This is needed when switching to a new contract deployment
 */
export const removeOldHandler = async (): Promise<string> => {
  const transaction = `
    import ScheduledTransfer from 0xfe1ad3a05230e532

    transaction {
      prepare(signer: auth(Storage) &Account) {
        // Remove old handler if it exists
        if signer.storage.type(at: ScheduledTransfer.HandlerStoragePath) != nil {
          let oldHandler <- signer.storage.load<@AnyResource>(from: ScheduledTransfer.HandlerStoragePath)
          destroy oldHandler
          log("Old handler removed")
        } else {
          log("No old handler found")
        }
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
    console.error('Failed to remove old handler:', error);
    throw new Error(error.message || 'Failed to remove old handler');
  }
};
