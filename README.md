# FlowSure — Scheduled, Insured Transfers on Flow

FlowSure makes blockchain transactions reliable by converting failed actions into scheduled retries and compensating users from an insurance vault if all retries fail—bringing safety, automation, and trust to on-chain operations.

## Overview

FlowSure is a transaction protection layer for the Flow blockchain that turns on-chain actions into safe, scheduled operations. It automatically retries failed actions and compensates users from an insurance vault if all retries are exhausted—optionally applying $FROTH staking discounts. Backed by contracts/Scheduler.cdc and a testnet ScheduledTransfer flow, it provides clear visibility via a dashboard.

## What it does

- **Scheduled execution** with automatic retries and time-aware triggers
- **Insurance & compensation** for failed transactions
- **$FROTH and $FLOW discounts** on fees
- **Dapper NFT protection** for Top Shot, All Day, and Disney Pinnacle

## Example Use Case: Scheduled Employee Payouts

1. **Set the payroll plan**: Define recipients, amounts, and pay dates in the FlowSure dashboard
2. **Hands‑off execution**: On each due date, the scheduler initiates transfers; transient failures are retried automatically
3. **Guaranteed outcomes**: If all retries fail, eligible compensation is paid from the insurance vault, and the status is reflected in the dashboard
4. **Operational transparency**: Track queued payouts, retry attempts, successful payments, and any compensations at a glance

## Project Structure

- `FlowSure-Frontend/` - Dashboard interface for managing scheduled transfers
- `FlowSure-Backend/` - API server for transaction processing and data management
- `FlowSure-SmartContract/` - Flow blockchain contracts and transactions

## Getting Started

1. Deploy the smart contracts to Flow testnet
2. Start the backend API server
3. Launch the frontend dashboard
4. Connect your wallet and create your first scheduled transfer
