import { useState, useEffect } from 'react';
import { fcl } from '@/lib/flow-config';

export interface ActionMetadata {
  name: string;
  description: string;
  actionType: string;
  version: string;
  author: string;
  tags: string[];
}

export interface ActionResult {
  success: boolean;
  message: string;
  actionId: string;
  retryCount: number;
  timestamp: number;
}

export function useFlowActions() {
  const [actions, setActions] = useState<Record<string, ActionMetadata>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_FLOW_CONTRACT_ACCOUNT || '0x8401ed4fc6788c8a';

  // Discover available actions
  const discoverActions = async () => {
    setLoading(true);
    setError(null);

    const script = `
      import FlowSureActions from ${contractAddress}
      import IFlowSureAction from ${contractAddress}

      access(all) fun main(): {String: ActionInfo} {
        let actions = FlowSureActions.getRegisteredActions()
        let actionInfo: {String: ActionInfo} = {}
        
        for key in actions.keys {
          let metadata = actions[key]!
          actionInfo[key] = ActionInfo(
            name: metadata.name,
            description: metadata.description,
            actionType: metadata.actionType,
            version: metadata.version,
            author: metadata.author.toString(),
            tags: metadata.tags
          )
        }
        
        return actionInfo
      }

      access(all) struct ActionInfo {
        access(all) let name: String
        access(all) let description: String
        access(all) let actionType: String
        access(all) let version: String
        access(all) let author: String
        access(all) let tags: [String]
        
        init(
          name: String,
          description: String,
          actionType: String,
          version: String,
          author: String,
          tags: [String]
        ) {
          self.name = name
          self.description = description
          self.actionType = actionType
          self.version = version
          self.author = author
          self.tags = tags
        }
      }
    `;

    try {
      const result = await fcl.query({
        cadence: script
      });
      setActions(result || {});
    } catch (err: any) {
      console.error('Error discovering actions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Execute insured transfer action
  const executeInsuredTransfer = async (
    recipient: string,
    amount: number,
    retryLimit: number = 3
  ): Promise<ActionResult | null> => {
    setLoading(true);
    setError(null);

    const transaction = `
      import FlowSureActions from ${contractAddress}
      import FrothRewards from ${contractAddress}
      import IFlowSureAction from ${contractAddress}

      transaction(
        recipient: Address,
        amount: UFix64,
        retryLimit: UInt8
      ) {
        let action: FlowSureActions.InsuredTransferAction
        let fee: UFix64
        
        prepare(signer: auth(BorrowValue) &Account) {
          self.action = FlowSureActions.createInsuredTransfer(
            baseFee: 1.0,
            compensationAmount: 5.0,
            retryLimit: retryLimit,
            retryDelay: 30.0
          )
          
          self.fee = self.action.estimateFees(user: signer.address)
          
          log("Action created: ".concat(self.action.uniqueID))
          log("Insurance fee: ".concat(self.fee.toString()))
        }
        
        execute {
          let params: {String: AnyStruct} = {
            "recipient": recipient,
            "amount": amount,
            "shouldFail": false
          }
          
          let result = self.action.execute(
            user: self.action.timestamp as! Address,
            params: params
          )
          
          log("Result: ".concat(result.message))
        }
      }
    `;

    try {
      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg, t) => [
          arg(recipient, t.Address),
          arg(amount.toFixed(8), t.UFix64),
          arg(retryLimit.toString(), t.UInt8)
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 9999
      });

      const tx = await fcl.tx(transactionId).onceSealed();
      
      return {
        success: tx.statusCode === 0,
        message: tx.statusCode === 0 ? 'Transfer successful' : 'Transfer failed',
        actionId: transactionId,
        retryCount: 0,
        timestamp: Date.now()
      };
    } catch (err: any) {
      console.error('Error executing transfer:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Execute insured swap action
  const executeInsuredSwap = async (
    inputAmount: number,
    minOutputAmount: number,
    retryLimit: number = 3
  ): Promise<ActionResult | null> {
    setLoading(true);
    setError(null);

    const transaction = `
      import FlowSureActions from ${contractAddress}
      import FlowToken from 0x7e60df042a9c0868
      import FrothRewards from ${contractAddress}
      import IFlowSureAction from ${contractAddress}

      transaction(
        inputAmount: UFix64,
        minOutputAmount: UFix64,
        retryLimit: UInt8
      ) {
        let action: FlowSureActions.InsuredSwapAction
        let fee: UFix64
        
        prepare(signer: auth(BorrowValue) &Account) {
          self.action = FlowSureActions.createInsuredSwap(
            inputType: Type<@FlowToken.Vault>(),
            outputType: Type<@FlowToken.Vault>(),
            baseFee: 1.0,
            compensationAmount: 5.0,
            retryLimit: retryLimit,
            retryDelay: 30.0
          )
          
          self.fee = self.action.estimateFees(user: signer.address)
          
          log("Swap action created: ".concat(self.action.uniqueID))
          log("Estimated output: ".concat(self.action.estimateOutput(inputAmount: inputAmount).toString()))
        }
        
        execute {
          let params: {String: AnyStruct} = {
            "inputAmount": inputAmount,
            "minOutputAmount": minOutputAmount,
            "shouldFail": false
          }
          
          let result = self.action.execute(
            user: self.action.timestamp as! Address,
            params: params
          )
          
          log("Swap result: ".concat(result.message))
        }
      }
    `;

    try {
      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg, t) => [
          arg(inputAmount.toFixed(8), t.UFix64),
          arg(minOutputAmount.toFixed(8), t.UFix64),
          arg(retryLimit.toString(), t.UInt8)
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 9999
      });

      const tx = await fcl.tx(transactionId).onceSealed();
      
      return {
        success: tx.statusCode === 0,
        message: tx.statusCode === 0 ? 'Swap successful' : 'Swap failed',
        actionId: transactionId,
        retryCount: 0,
        timestamp: Date.now()
      };
    } catch (err: any) {
      console.error('Error executing swap:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get actions by type
  const getActionsByType = (actionType: string): ActionMetadata[] => {
    return Object.values(actions).filter(action => action.actionType === actionType);
  };

  // Get actions by tag
  const getActionsByTag = (tag: string): ActionMetadata[] => {
    return Object.values(actions).filter(action => action.tags.includes(tag));
  };

  useEffect(() => {
    discoverActions();
  }, []);

  return {
    actions,
    loading,
    error,
    discoverActions,
    executeInsuredTransfer,
    executeInsuredSwap,
    getActionsByType,
    getActionsByTag
  };
}
