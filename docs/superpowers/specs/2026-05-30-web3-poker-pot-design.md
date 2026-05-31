# Web3 Poker Pot Design

Date: 2026-05-30

## Summary

Build an EVM dapp for poker-night organisers to create ERC-20 token pots. An organiser creates a game, chooses an allowlisted token, sets the token amount for one buy-in, manages the participant whitelist, and finalizes the game by allocating the full pot to payout recipients. Whitelisted wallets can buy in multiple times while the game is open, and the interface shows each participant's buy-in count.

The first version is a contract-first monorepo: smart contracts and contract tests define the custody and payout rules before the React app is wired to the contract ABI.

## Confirmed Product Decisions

- Target chain/runtime: EVM.
- Token standard: ERC-20.
- Token selection: curated allowlist managed by the contract owner.
- First deploy target: local development chain plus one EVM testnet.
- Finalization: organiser-only.
- Payout rule: final allocations must sum exactly to the full recorded pot.
- Whitelist: organiser can add or remove addresses while the game is open.
- Cancellation/refund: not included in v1.
- Buy-ins: whitelisted wallets can buy in multiple times.
- Discovery: shared game link by `gameId`; no backend indexer in v1.

## Architecture

Use a single repository with three main areas:

- `contracts/`: Solidity contracts for the poker-pot game lifecycle.
- `test/`: contract tests for custody, authorization, buy-in accounting, whitelist changes, and payout finalization.
- `app/`: React/Vite dapp with wallet connection, game creation, game detail, buy-in, whitelist management, and finalization screens.
- `scripts/` or `deploy/`: local and testnet deployment scripts, including allowlisted token configuration.

The main contract is named `PokerPot` and stores multiple games. Each game includes:

- organiser address
- ERC-20 token address
- buy-in amount
- game status
- total pot amount
- whitelist status by address
- whitelist address list for app display
- participant list for wallets that have bought in
- buy-in count by address
- final payout records after settlement

The contract owner manages the curated token allowlist. The organiser controls each game they create.

## Contract Behavior

### Token Allowlist

Only contract-owner-approved ERC-20 token addresses can be used when creating a game. The v1 assumption is that allowlisted tokens are standard non-rebasing, non-fee-on-transfer ERC-20s. The contract is not designed to support transfer-tax, rebasing, or callback-heavy token behavior.

### Create Game

The organiser creates a game by selecting an allowlisted token, setting a nonzero buy-in amount, and providing an initial whitelist. The contract records the organiser as the only address allowed to manage the game's whitelist and finalize payouts.

Invalid creation inputs revert:

- non-allowlisted token
- zero buy-in amount
- empty initial whitelist

### Whitelist Management

The organiser can add or remove addresses while the game is open. Removing a participant from the whitelist blocks future buy-ins but does not refund or erase previous buy-ins. Whitelist edits are unavailable after finalization.

### Buy In

A whitelisted wallet can call `buyIn(gameId, count)` while the game is open. `count` must be greater than zero. The required transfer amount is `buyInAmount * count`.

The participant must approve the `PokerPot` contract to spend the ERC-20 token before buying in. On successful transfer, the contract increments the wallet's buy-in count, adds the address to the participant list if needed, and increases the recorded total pot.

### Finalize

Only the organiser can finalize an open game. Finalization accepts payout recipients and payout amounts. The sum of payout amounts must equal the recorded total pot exactly.

Payout recipients do not need to match the whitelist or participant list. This allows the organiser to pay only winners, split the pot among a subset of players, or route winnings to a different wallet requested by a player.

Finalization transfers the ERC-20 payouts and permanently closes the game. After finalization:

- no more buy-ins are accepted
- no whitelist changes are accepted
- payout allocations cannot be changed
- final payout data remains visible to the app

## UI Flow

### Organiser Create View

The organiser connects a wallet, selects an allowlisted token, enters the buy-in amount in token units, adds whitelist addresses, and creates the game. After successful creation, the app routes to the game detail page.

### Game Detail View

The game page shows:

- organiser
- token
- buy-in amount
- game status
- total pot
- whitelist addresses
- participants that have bought in
- each participant's buy-in count
- final payouts if finalized

Role-based controls:

- Whitelisted connected wallet, game open: approve and buy in.
- Organiser connected wallet, game open: add/remove whitelist addresses.
- Organiser connected wallet, game open and pot nonzero: enter payout allocation and finalize.

### Finalize View

The organiser enters payout rows with recipient address and amount. The UI calculates the payout total and blocks submission unless the total equals the current pot. The contract repeats this validation on-chain.

After successful finalization, the UI refreshes and shows the finalized payout records and closed game status.

## Error Handling

The UI should block obvious invalid input before prompting for a wallet transaction:

- invalid address format
- zero or invalid buy-in amount
- no token selected
- token not in allowlist
- empty or invalid whitelist at creation
- payout total mismatch
- zero payout rows when pot is nonzero

The contract remains the source of truth for authorization and accounting. Failed transactions should leave the user on the current screen and trigger a state refresh so the app reflects the latest chain state.

ERC-20 buy-in uses the standard two-step approval flow:

1. participant approves token spend
2. participant submits buy-in transaction

The UI should detect existing allowance and skip the approve prompt when the allowance is already sufficient.

## Testing Strategy

### Contract Tests

Write contract tests before production contract code. Required cases:

- owner can allowlist and remove tokens
- non-owner cannot manage token allowlist
- game creation succeeds with an allowlisted token
- game creation rejects a non-allowlisted token
- game creation rejects zero buy-in amount
- only organiser can edit a game's whitelist
- organiser can add and remove whitelist addresses while open
- removed whitelist member cannot buy in again
- whitelisted participant can buy in once
- whitelisted participant can buy in multiple times in one call
- multiple buy-ins update buy-in count and total pot correctly
- non-whitelisted wallet cannot buy in
- buy-in rejects zero count
- only organiser can finalize
- finalization rejects payout totals below or above the pot
- finalization transfers the full pot to recipients
- finalization closes the game permanently
- finalized games reject further buy-ins, whitelist edits, and repeated finalization

### UI Tests

After the contract API is stable, add focused UI tests for:

- create-game form validation
- token allowlist rendering
- connected-wallet role-based controls
- approval/buy-in state handling through mocked hooks
- whitelist editing form behavior
- payout total calculation
- finalization disabled state when allocation does not match pot

## Out Of Scope For V1

- cancellation and refunds
- participant approval of final results
- organiser/platform rake or fee
- backend indexing
- public game discovery
- support for fee-on-transfer, rebasing, or nonstandard ERC-20 tokens
- multi-token pots
- native ETH pots
- dispute resolution
- upgradeable contract architecture

## Open Implementation Choices

These choices can be made during implementation planning without changing the product design:

- Hardhat versus Foundry for Solidity tooling.
- Exact testnet target, such as Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, or Sepolia.
- Wallet library, likely Wagmi plus RainbowKit or a similarly mainstream EVM stack.
- Whether final payout records are stored as arrays on-chain or reconstructed primarily from events.
