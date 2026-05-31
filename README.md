# Web3 Poker Pot

EVM dapp for poker-night organisers to create ERC-20 pots, whitelist participants, accept multiple buy-ins, and finalize exact full-pot payouts.

## What It Does

- Contract owner curates ERC-20 tokens that organisers can use for games.
- Organisers create games with one allowlisted token, one buy-in amount, and an initial whitelist.
- Whitelisted wallets can approve the game contract and buy in multiple times.
- The game page shows the organiser, token, buy-in amount, status, pot, whitelist, participants, and buy-in counts.
- Organisers can update the whitelist while the game is open.
- Organisers finalize by allocating exactly the full recorded pot to payout recipients.

## Local Development

This workspace is on Windows. If npm shims resolve the wrong Node runtime, prepend the system Node and Git paths before commands:

```powershell
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
```

Install dependencies:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
```

Run contract tests:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:contracts
```

Run app tests:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:app
```

Build the app:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run build:app
```

## Local Chain

Start a local Hardhat chain:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' exec hardhat -- node
```

Deploy the contracts in another terminal:

```powershell
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
& 'C:\Program Files\nodejs\npm.cmd' run deploy:local
& 'C:\Program Files\nodejs\npm.cmd' run export:abi
```

Start the app:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' --workspace app run dev
```

The app reads the local deployment from `app/src/contracts/deployments.local.json`. Local deployment creates a mock `PUSD` token and allowlists it. The mock token exposes `mint(account, amount)`, so local wallets need mock tokens minted before they can buy in.

## Testnet Deploy

Create a local `.env` from `.env.example`, then set:

```text
TESTNET_RPC_URL=
DEPLOYER_PRIVATE_KEY=
ALLOWLIST_TOKEN_ADDRESSES=
```

Deploy and export metadata:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run deploy:testnet
& 'C:\Program Files\nodejs\npm.cmd' run export:abi
```

For non-local networks, deployment writes `app/src/contracts/deployments.<network>.json`. The app currently imports `deployments.local.json`, so switch the imported deployment file before building for a testnet UI.

## Verification

```powershell
$env:Path = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + $env:Path
& 'C:\Program Files\nodejs\npm.cmd' run compile
& 'C:\Program Files\nodejs\npm.cmd' run test:contracts
& 'C:\Program Files\nodejs\npm.cmd' run test:app
& 'C:\Program Files\nodejs\npm.cmd' run build:app
```
