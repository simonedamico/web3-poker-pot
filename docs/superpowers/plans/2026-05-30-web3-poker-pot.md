# Web3 Poker Pot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an EVM ERC-20 poker-pot dapp where organisers create whitelisted games, participants buy in multiple times, and organisers finalize exact full-pot payouts.

**Architecture:** Use a contract-first monorepo. The Solidity `PokerPot` contract owns custody and accounting, contract tests define the critical behavior, and the React/Vite app reads from and writes to the deployed contract through Wagmi/Viem.

**Tech Stack:** Solidity 0.8.24, Hardhat, TypeScript, OpenZeppelin Contracts, React, Vite, Vitest, React Testing Library, Wagmi, Viem, RainbowKit.

---

## File Structure

- Create `package.json`: root npm scripts and dev dependencies for Hardhat and the app workspace.
- Create `hardhat.config.ts`: Solidity compiler, local/testnet network config, and TypeScript Hardhat setup.
- Create `tsconfig.json`: shared TypeScript settings for Hardhat scripts and tests.
- Create `.env.example`: deployment variables without secrets.
- Create `contracts/PokerPot.sol`: main custody and lifecycle contract.
- Create `contracts/mocks/MockERC20.sol`: mintable test token for local tests and local demos.
- Create `test/PokerPot.allowlist.test.ts`: token allowlist tests.
- Create `test/PokerPot.game.test.ts`: game creation and whitelist tests.
- Create `test/PokerPot.buyIn.test.ts`: ERC-20 buy-in and accounting tests.
- Create `test/PokerPot.finalize.test.ts`: payout and finalization tests.
- Create `scripts/deploy.ts`: deploy `PokerPot`, deploy optional mock token locally, and configure allowlist.
- Create `scripts/export-abi.ts`: copy ABI and deployed addresses into the app.
- Create `app/package.json`: frontend dependencies and scripts.
- Create `app/index.html`: Vite entry HTML.
- Create `app/vite.config.ts`: React and Vitest config.
- Create `app/tsconfig.json`: frontend TypeScript config.
- Create `app/src/main.tsx`: React root.
- Create `app/src/App.tsx`: app shell and routes.
- Create `app/src/contracts/pokerPot.ts`: contract address, ABI import, and typed contract metadata.
- Create `app/src/contracts/deployments.local.json`: local deployment seed object for app reads after deployment script updates it.
- Create `app/src/lib/address.ts`: address parsing and list normalization helpers.
- Create `app/src/lib/tokenAmount.ts`: token amount parsing, formatting, and payout sum helpers.
- Create `app/src/lib/gameView.ts`: pure helpers for role and game state derivation.
- Create `app/src/hooks/usePokerPot.ts`: Wagmi hooks for contract reads and writes.
- Create `app/src/pages/CreateGamePage.tsx`: organiser create form.
- Create `app/src/pages/GamePage.tsx`: game detail, buy-in, whitelist management, and finalized status.
- Create `app/src/components/FinalizeForm.tsx`: payout allocation form.
- Create `app/src/components/TokenAmountInput.tsx`: reusable decimal amount input.
- Create `app/src/components/AddressListInput.tsx`: reusable multiline address list input.
- Create `app/src/test/setup.ts`: React Testing Library setup.
- Create `app/src/**/*.test.ts` and `app/src/**/*.test.tsx`: focused frontend tests.

## Task 1: Scaffold Tooling

**Files:**
- Create: `package.json`
- Create: `hardhat.config.ts`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `app/package.json`
- Create: `app/index.html`
- Create: `app/vite.config.ts`
- Create: `app/tsconfig.json`
- Create: `app/src/test/setup.ts`

- [ ] **Step 1: Create root package metadata**

Write `package.json`:

```json
{
  "name": "web3-poker-pot",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "app"
  ],
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "test:contracts": "hardhat test",
    "test:app": "npm --workspace app run test",
    "build:app": "npm --workspace app run build",
    "lint": "npm --workspace app run lint",
    "deploy:local": "hardhat run scripts/deploy.ts --network localhost",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network testnet",
    "export:abi": "hardhat run scripts/export-abi.ts"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.0.2",
    "dotenv": "^16.4.5",
    "hardhat": "^2.22.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and Hardhat config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "mocha"]
  },
  "include": ["hardhat.config.ts", "scripts", "test"]
}
```

Write `hardhat.config.ts`:

```ts
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const testnetUrl = process.env.TESTNET_RPC_URL ?? "";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    testnet: {
      url: testnetUrl,
      accounts: deployerKey ? [deployerKey] : []
    }
  }
};

export default config;
```

Write `.env.example`:

```text
TESTNET_RPC_URL=https://example-testnet-rpc.invalid
DEPLOYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
POKER_POT_ADDRESS=
ALLOWLIST_TOKEN_ADDRESSES=
```

- [ ] **Step 3: Create frontend package and Vite config**

Write `app/package.json`:

```json
{
  "name": "web3-poker-pot-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -b --pretty false"
  },
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.1.0",
    "@tanstack/react-query": "^5.40.0",
    "lucide-react": "^0.468.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "viem": "^2.12.0",
    "wagmi": "^2.9.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^15.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

Write `app/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web3 Poker Pot</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `app/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true
  }
});
```

Write `app/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

Write `app/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Verify scaffold commands**

Run:

```powershell
npm run compile
npm run test:app
```

Expected: Hardhat reports no contracts to compile or compiles an empty project without failure; Vitest reports no test files or exits cleanly after the app test setup is valid.

- [ ] **Step 6: Commit scaffold**

Run:

```powershell
git add package.json package-lock.json hardhat.config.ts tsconfig.json .env.example app/package.json app/index.html app/vite.config.ts app/tsconfig.json app/src/test/setup.ts
git commit -m "chore: scaffold hardhat and react workspaces"
```

## Task 2: Token Allowlist Contract

**Files:**
- Create: `contracts/PokerPot.sol`
- Create: `test/PokerPot.allowlist.test.ts`

- [ ] **Step 1: Write failing allowlist tests**

Write `test/PokerPot.allowlist.test.ts`:

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot token allowlist", function () {
  async function deployFixture() {
    const [owner, other, token] = await ethers.getSigners();
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    return { pokerPot, owner, other, token };
  }

  it("lets the owner allowlist and remove a token", async function () {
    const { pokerPot, token } = await deployFixture();

    await expect(pokerPot.setTokenAllowed(token.address, true))
      .to.emit(pokerPot, "TokenAllowlistUpdated")
      .withArgs(token.address, true);

    expect(await pokerPot.isTokenAllowed(token.address)).to.equal(true);

    await expect(pokerPot.setTokenAllowed(token.address, false))
      .to.emit(pokerPot, "TokenAllowlistUpdated")
      .withArgs(token.address, false);

    expect(await pokerPot.isTokenAllowed(token.address)).to.equal(false);
  });

  it("rejects allowlist changes from non-owners", async function () {
    const { pokerPot, other, token } = await deployFixture();

    await expect(
      pokerPot.connect(other).setTokenAllowed(token.address, true)
    ).to.be.revertedWithCustomError(pokerPot, "OwnableUnauthorizedAccount");
  });

  it("rejects the zero address token", async function () {
    const { pokerPot } = await deployFixture();

    await expect(
      pokerPot.setTokenAllowed(ethers.ZeroAddress, true)
    ).to.be.revertedWithCustomError(pokerPot, "InvalidToken");
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npm run test:contracts -- test/PokerPot.allowlist.test.ts
```

Expected: FAIL because `contracts/PokerPot.sol` does not exist or `PokerPot` is not compiled.

- [ ] **Step 3: Implement minimal allowlist contract**

Write `contracts/PokerPot.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PokerPot is Ownable {
    error InvalidToken();

    mapping(address => bool) private allowedTokens;

    event TokenAllowlistUpdated(address indexed token, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```powershell
npm run test:contracts -- test/PokerPot.allowlist.test.ts
```

Expected: PASS for all allowlist tests.

- [ ] **Step 5: Commit allowlist behavior**

Run:

```powershell
git add contracts/PokerPot.sol test/PokerPot.allowlist.test.ts
git commit -m "feat: add token allowlist"
```

## Task 3: Game Creation And Whitelist Management

**Files:**
- Modify: `contracts/PokerPot.sol`
- Create: `test/PokerPot.game.test.ts`

- [ ] **Step 1: Write failing game tests**

Write `test/PokerPot.game.test.ts`:

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot game management", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, outsider, token] = await ethers.getSigners();
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(token.address, true);
    return { pokerPot, owner, organiser, playerA, playerB, outsider, token };
  }

  it("creates a game with an allowlisted token and initial whitelist", async function () {
    const { pokerPot, organiser, playerA, playerB, token } = await deployFixture();
    const buyInAmount = ethers.parseUnits("25", 6);

    await expect(
      pokerPot.connect(organiser).createGame(token.address, buyInAmount, [
        playerA.address,
        playerB.address
      ])
    )
      .to.emit(pokerPot, "GameCreated")
      .withArgs(1n, organiser.address, token.address, buyInAmount);

    const game = await pokerPot.getGame(1);
    expect(game.organiser).to.equal(organiser.address);
    expect(game.token).to.equal(token.address);
    expect(game.buyInAmount).to.equal(buyInAmount);
    expect(game.status).to.equal(0);
    expect(game.totalPot).to.equal(0);
    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address
    ]);
    expect(await pokerPot.isWhitelisted(1, playerA.address)).to.equal(true);
    expect(await pokerPot.isWhitelisted(1, playerB.address)).to.equal(true);
  });

  it("rejects game creation with a non-allowlisted token", async function () {
    const { pokerPot, organiser, playerA, outsider } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).createGame(outsider.address, 1n, [playerA.address])
    ).to.be.revertedWithCustomError(pokerPot, "TokenNotAllowed");
  });

  it("rejects zero buy-in amount and empty whitelist", async function () {
    const { pokerPot, organiser, playerA, token } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).createGame(token.address, 0n, [playerA.address])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidBuyInAmount");

    await expect(
      pokerPot.connect(organiser).createGame(token.address, 1n, [])
    ).to.be.revertedWithCustomError(pokerPot, "EmptyWhitelist");
  });

  it("lets only the organiser update whitelist while open", async function () {
    const { pokerPot, organiser, playerA, playerB, outsider, token } = await deployFixture();
    await pokerPot.connect(organiser).createGame(token.address, 1n, [playerA.address]);

    await expect(
      pokerPot.connect(outsider).setWhitelist(1, playerB.address, true)
    ).to.be.revertedWithCustomError(pokerPot, "OnlyOrganiser");

    await expect(pokerPot.connect(organiser).setWhitelist(1, playerB.address, true))
      .to.emit(pokerPot, "WhitelistUpdated")
      .withArgs(1n, playerB.address, true);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([playerA.address, playerB.address]);

    await expect(pokerPot.connect(organiser).setWhitelist(1, playerA.address, false))
      .to.emit(pokerPot, "WhitelistUpdated")
      .withArgs(1n, playerA.address, false);

    expect(await pokerPot.isWhitelisted(1, playerA.address)).to.equal(false);
    expect(await pokerPot.getWhitelist(1)).to.deep.equal([playerB.address]);
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npm run test:contracts -- test/PokerPot.game.test.ts
```

Expected: FAIL because `createGame`, `getGame`, `getWhitelist`, `isWhitelisted`, and `setWhitelist` are missing.

- [ ] **Step 3: Implement game state and whitelist management**

Replace `contracts/PokerPot.sol` with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PokerPot is Ownable {
    enum GameStatus {
        Open,
        Finalized
    }

    struct Game {
        address organiser;
        address token;
        uint256 buyInAmount;
        GameStatus status;
        uint256 totalPot;
        address[] whitelist;
        address[] participants;
        address[] payoutRecipients;
        uint256[] payoutAmounts;
    }

    error InvalidToken();
    error TokenNotAllowed();
    error InvalidBuyInAmount();
    error EmptyWhitelist();
    error InvalidAddress();
    error GameNotFound();
    error OnlyOrganiser();
    error GameClosed();

    uint256 public nextGameId = 1;

    mapping(address => bool) private allowedTokens;
    mapping(uint256 => Game) private games;
    mapping(uint256 => mapping(address => bool)) public isWhitelisted;
    mapping(uint256 => mapping(address => uint256)) private whitelistIndexPlusOne;

    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event GameCreated(uint256 indexed gameId, address indexed organiser, address indexed token, uint256 buyInAmount);
    event WhitelistUpdated(uint256 indexed gameId, address indexed account, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }

    function createGame(address token, uint256 buyInAmount, address[] calldata initialWhitelist)
        external
        returns (uint256 gameId)
    {
        if (!allowedTokens[token]) revert TokenNotAllowed();
        if (buyInAmount == 0) revert InvalidBuyInAmount();
        if (initialWhitelist.length == 0) revert EmptyWhitelist();

        gameId = nextGameId++;
        Game storage game = games[gameId];
        game.organiser = msg.sender;
        game.token = token;
        game.buyInAmount = buyInAmount;
        game.status = GameStatus.Open;

        for (uint256 i = 0; i < initialWhitelist.length; i++) {
            _setWhitelist(gameId, initialWhitelist[i], true);
        }

        emit GameCreated(gameId, msg.sender, token, buyInAmount);
    }

    function setWhitelist(uint256 gameId, address account, bool allowed) external {
        Game storage game = _requireGame(gameId);
        if (msg.sender != game.organiser) revert OnlyOrganiser();
        if (game.status != GameStatus.Open) revert GameClosed();
        _setWhitelist(gameId, account, allowed);
        emit WhitelistUpdated(gameId, account, allowed);
    }

    function getGame(uint256 gameId)
        external
        view
        returns (address organiser, address token, uint256 buyInAmount, GameStatus status, uint256 totalPot)
    {
        Game storage game = _requireGame(gameId);
        return (game.organiser, game.token, game.buyInAmount, game.status, game.totalPot);
    }

    function getWhitelist(uint256 gameId) external view returns (address[] memory) {
        return _requireGame(gameId).whitelist;
    }

    function _setWhitelist(uint256 gameId, address account, bool allowed) private {
        if (account == address(0)) revert InvalidAddress();
        bool current = isWhitelisted[gameId][account];
        if (allowed == current) return;

        Game storage game = games[gameId];
        isWhitelisted[gameId][account] = allowed;

        if (allowed) {
            game.whitelist.push(account);
            whitelistIndexPlusOne[gameId][account] = game.whitelist.length;
            return;
        }

        uint256 index = whitelistIndexPlusOne[gameId][account] - 1;
        uint256 lastIndex = game.whitelist.length - 1;
        if (index != lastIndex) {
            address lastAccount = game.whitelist[lastIndex];
            game.whitelist[index] = lastAccount;
            whitelistIndexPlusOne[gameId][lastAccount] = index + 1;
        }
        game.whitelist.pop();
        whitelistIndexPlusOne[gameId][account] = 0;
    }

    function _requireGame(uint256 gameId) private view returns (Game storage game) {
        game = games[gameId];
        if (game.organiser == address(0)) revert GameNotFound();
    }
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```powershell
npm run test:contracts -- test/PokerPot.allowlist.test.ts test/PokerPot.game.test.ts
```

Expected: PASS for allowlist and game tests.

- [ ] **Step 5: Commit game management**

Run:

```powershell
git add contracts/PokerPot.sol test/PokerPot.game.test.ts
git commit -m "feat: add game creation and whitelist management"
```

## Task 4: ERC-20 Buy-In Accounting

**Files:**
- Create: `contracts/mocks/MockERC20.sol`
- Modify: `contracts/PokerPot.sol`
- Create: `test/PokerPot.buyIn.test.ts`

- [ ] **Step 1: Write failing buy-in tests**

Write `test/PokerPot.buyIn.test.ts`:

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot buy-ins", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, outsider] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Poker USD", "PUSD", 6);
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(await token.getAddress(), true);
    const buyInAmount = ethers.parseUnits("25", 6);
    await pokerPot.connect(organiser).createGame(await token.getAddress(), buyInAmount, [
      playerA.address,
      playerB.address
    ]);
    await token.mint(playerA.address, ethers.parseUnits("250", 6));
    await token.mint(playerB.address, ethers.parseUnits("250", 6));
    await token.mint(outsider.address, ethers.parseUnits("250", 6));
    return { pokerPot, token, organiser, playerA, playerB, outsider, buyInAmount };
  }

  it("lets a whitelisted participant buy in once", async function () {
    const { pokerPot, token, playerA, buyInAmount } = await deployFixture();
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);

    await expect(pokerPot.connect(playerA).buyIn(1, 1))
      .to.emit(pokerPot, "BuyIn")
      .withArgs(1n, playerA.address, 1n, buyInAmount);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(1);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount);
  });

  it("lets a whitelisted participant buy in multiple times in one transaction", async function () {
    const { pokerPot, token, playerA, buyInAmount } = await deployFixture();
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount * 3n);

    await pokerPot.connect(playerA).buyIn(1, 3);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(3);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount * 3n);
  });

  it("tracks multiple participants without duplicates", async function () {
    const { pokerPot, token, playerA, playerB, buyInAmount } = await deployFixture();
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount * 2n);
    await token.connect(playerB).approve(await pokerPot.getAddress(), buyInAmount);

    await pokerPot.connect(playerA).buyIn(1, 1);
    await pokerPot.connect(playerA).buyIn(1, 1);
    await pokerPot.connect(playerB).buyIn(1, 1);

    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address, playerB.address]);
    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(2);
    expect(await pokerPot.buyInCount(1, playerB.address)).to.equal(1);
  });

  it("rejects non-whitelisted, removed, and zero-count buy-ins", async function () {
    const { pokerPot, token, organiser, playerA, outsider, buyInAmount } = await deployFixture();
    await token.connect(outsider).approve(await pokerPot.getAddress(), buyInAmount);

    await expect(pokerPot.connect(outsider).buyIn(1, 1))
      .to.be.revertedWithCustomError(pokerPot, "NotWhitelisted");

    await pokerPot.connect(organiser).setWhitelist(1, playerA.address, false);
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);
    await expect(pokerPot.connect(playerA).buyIn(1, 1))
      .to.be.revertedWithCustomError(pokerPot, "NotWhitelisted");

    await expect(pokerPot.connect(playerA).buyIn(1, 0))
      .to.be.revertedWithCustomError(pokerPot, "InvalidBuyInCount");
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npm run test:contracts -- test/PokerPot.buyIn.test.ts
```

Expected: FAIL because `MockERC20`, `buyIn`, `buyInCount`, and `getParticipants` are missing.

- [ ] **Step 3: Add mock token**

Write `contracts/mocks/MockERC20.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable tokenDecimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return tokenDecimals;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
```

- [ ] **Step 4: Implement buy-in behavior**

Modify `contracts/PokerPot.sol`:

```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
```

Change the contract declaration:

```solidity
contract PokerPot is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
```

Add errors and state:

```solidity
    error NotWhitelisted();
    error InvalidBuyInCount();

    mapping(uint256 => mapping(address => uint256)) public buyInCount;
    mapping(uint256 => mapping(address => bool)) private hasParticipated;
```

Add the buy-in functions before private helpers:

```solidity
    function buyIn(uint256 gameId, uint256 count) external nonReentrant {
        Game storage game = _requireGame(gameId);
        if (game.status != GameStatus.Open) revert GameClosed();
        if (!isWhitelisted[gameId][msg.sender]) revert NotWhitelisted();
        if (count == 0) revert InvalidBuyInCount();

        uint256 amount = game.buyInAmount * count;
        IERC20(game.token).safeTransferFrom(msg.sender, address(this), amount);

        buyInCount[gameId][msg.sender] += count;
        game.totalPot += amount;

        if (!hasParticipated[gameId][msg.sender]) {
            hasParticipated[gameId][msg.sender] = true;
            game.participants.push(msg.sender);
        }

        emit BuyIn(gameId, msg.sender, count, amount);
    }

    function getParticipants(uint256 gameId) external view returns (address[] memory) {
        return _requireGame(gameId).participants;
    }
```

Add the event near the other events:

```solidity
    event BuyIn(uint256 indexed gameId, address indexed participant, uint256 count, uint256 amount);
```

- [ ] **Step 5: Run tests to verify GREEN**

Run:

```powershell
npm run test:contracts -- test/PokerPot.allowlist.test.ts test/PokerPot.game.test.ts test/PokerPot.buyIn.test.ts
```

Expected: PASS for allowlist, game, and buy-in tests.

- [ ] **Step 6: Commit buy-in behavior**

Run:

```powershell
git add contracts/PokerPot.sol contracts/mocks/MockERC20.sol test/PokerPot.buyIn.test.ts
git commit -m "feat: add erc20 buy-ins"
```

## Task 5: Full-Pot Finalization

**Files:**
- Modify: `contracts/PokerPot.sol`
- Create: `test/PokerPot.finalize.test.ts`

- [ ] **Step 1: Write failing finalization tests**

Write `test/PokerPot.finalize.test.ts`:

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot finalization", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, winner, outsider] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Poker USD", "PUSD", 6);
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(await token.getAddress(), true);
    const buyInAmount = ethers.parseUnits("25", 6);
    await pokerPot.connect(organiser).createGame(await token.getAddress(), buyInAmount, [
      playerA.address,
      playerB.address
    ]);
    await token.mint(playerA.address, buyInAmount * 3n);
    await token.mint(playerB.address, buyInAmount * 3n);
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount * 2n);
    await token.connect(playerB).approve(await pokerPot.getAddress(), buyInAmount);
    await pokerPot.connect(playerA).buyIn(1, 2);
    await pokerPot.connect(playerB).buyIn(1, 1);
    const pot = buyInAmount * 3n;
    return { pokerPot, token, organiser, playerA, playerB, winner, outsider, buyInAmount, pot };
  }

  it("lets only the organiser finalize exact full-pot payouts", async function () {
    const { pokerPot, token, organiser, winner, outsider, pot } = await deployFixture();

    await expect(
      pokerPot.connect(outsider).finalize(1, [winner.address], [pot])
    ).to.be.revertedWithCustomError(pokerPot, "OnlyOrganiser");

    await expect(pokerPot.connect(organiser).finalize(1, [winner.address], [pot]))
      .to.emit(pokerPot, "GameFinalized")
      .withArgs(1n, pot);

    expect(await token.balanceOf(winner.address)).to.equal(pot);
    const game = await pokerPot.getGame(1);
    expect(game.status).to.equal(1);
    const payouts = await pokerPot.getPayouts(1);
    expect(payouts.recipients).to.deep.equal([winner.address]);
    expect(payouts.amounts).to.deep.equal([pot]);
  });

  it("rejects payout totals below or above the pot", async function () {
    const { pokerPot, organiser, winner, playerA, pot } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [pot - 1n])
    ).to.be.revertedWithCustomError(pokerPot, "PayoutTotalMismatch");

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [pot + 1n])
    ).to.be.revertedWithCustomError(pokerPot, "PayoutTotalMismatch");

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address, playerA.address], [pot - 1n, 1n])
    ).to.emit(pokerPot, "GameFinalized");
  });

  it("rejects malformed payout arrays and zero-recipient payouts", async function () {
    const { pokerPot, organiser, winner, pot } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidPayouts");

    await expect(
      pokerPot.connect(organiser).finalize(1, [ethers.ZeroAddress], [pot])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidAddress");
  });

  it("locks finalized games against further changes", async function () {
    const { pokerPot, token, organiser, playerA, winner, pot, buyInAmount } = await deployFixture();
    await pokerPot.connect(organiser).finalize(1, [winner.address], [pot]);

    await expect(
      pokerPot.connect(organiser).setWhitelist(1, playerA.address, false)
    ).to.be.revertedWithCustomError(pokerPot, "GameClosed");

    await token.mint(playerA.address, buyInAmount);
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);
    await expect(pokerPot.connect(playerA).buyIn(1, 1))
      .to.be.revertedWithCustomError(pokerPot, "GameClosed");

    await expect(pokerPot.connect(organiser).finalize(1, [winner.address], [1n]))
      .to.be.revertedWithCustomError(pokerPot, "GameClosed");
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npm run test:contracts -- test/PokerPot.finalize.test.ts
```

Expected: FAIL because `finalize` and `getPayouts` are missing.

- [ ] **Step 3: Implement finalization**

Modify `contracts/PokerPot.sol`.

Add errors:

```solidity
    error InvalidPayouts();
    error PayoutTotalMismatch();
```

Add event:

```solidity
    event GameFinalized(uint256 indexed gameId, uint256 totalPaid);
```

Add functions before private helpers:

```solidity
    function finalize(uint256 gameId, address[] calldata recipients, uint256[] calldata amounts)
        external
        nonReentrant
    {
        Game storage game = _requireGame(gameId);
        if (msg.sender != game.organiser) revert OnlyOrganiser();
        if (game.status != GameStatus.Open) revert GameClosed();
        if (recipients.length == 0 || recipients.length != amounts.length) revert InvalidPayouts();

        uint256 totalPaid = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert InvalidAddress();
            totalPaid += amounts[i];
        }
        if (totalPaid != game.totalPot) revert PayoutTotalMismatch();

        game.status = GameStatus.Finalized;

        for (uint256 i = 0; i < recipients.length; i++) {
            game.payoutRecipients.push(recipients[i]);
            game.payoutAmounts.push(amounts[i]);
            IERC20(game.token).safeTransfer(recipients[i], amounts[i]);
        }

        emit GameFinalized(gameId, totalPaid);
    }

    function getPayouts(uint256 gameId)
        external
        view
        returns (address[] memory recipients, uint256[] memory amounts)
    {
        Game storage game = _requireGame(gameId);
        return (game.payoutRecipients, game.payoutAmounts);
    }
```

- [ ] **Step 4: Run all contract tests**

Run:

```powershell
npm run test:contracts
```

Expected: PASS for all contract tests.

- [ ] **Step 5: Commit finalization**

Run:

```powershell
git add contracts/PokerPot.sol test/PokerPot.finalize.test.ts
git commit -m "feat: add exact pot finalization"
```

## Task 6: Deployment And ABI Export

**Files:**
- Create: `scripts/deploy.ts`
- Create: `scripts/export-abi.ts`
- Create: `app/src/contracts/deployments.local.json`
- Create: `app/src/contracts/PokerPot.json`

- [ ] **Step 1: Write deployment script**

Write `scripts/deploy.ts`:

```ts
import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();

  const PokerPot = await ethers.getContractFactory("PokerPot");
  const pokerPot = await PokerPot.deploy(deployer.address);
  await pokerPot.waitForDeployment();

  const pokerPotAddress = await pokerPot.getAddress();
  const allowedTokens = (process.env.ALLOWLIST_TOKEN_ADDRESSES ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  let mockTokenAddress = "";
  if (network.name === "localhost" || network.name === "hardhat") {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Poker USD", "PUSD", 6);
    await mockToken.waitForDeployment();
    mockTokenAddress = await mockToken.getAddress();
    allowedTokens.push(mockTokenAddress);
  }

  for (const token of allowedTokens) {
    const tx = await pokerPot.setTokenAllowed(token, true);
    await tx.wait();
  }

  const output = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    pokerPot: pokerPotAddress,
    mockToken: mockTokenAddress,
    allowlistedTokens: allowedTokens
  };

  const outputPath = path.join(process.cwd(), "app", "src", "contracts", "deployments.local.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write ABI export script**

Write `scripts/export-abi.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

async function main() {
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "PokerPot.sol", "PokerPot.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outputPath = path.join(process.cwd(), "app", "src", "contracts", "PokerPot.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ abi: artifact.abi }, null, 2) + "\n");
  console.log(`Exported PokerPot ABI to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 3: Seed deployment JSON for app tests**

Write `app/src/contracts/deployments.local.json`:

```json
{
  "network": "local",
  "chainId": 31337,
  "pokerPot": "0x0000000000000000000000000000000000000000",
  "mockToken": "0x0000000000000000000000000000000000000000",
  "allowlistedTokens": []
}
```

Write `app/src/contracts/PokerPot.json`:

```json
{
  "abi": []
}
```

- [ ] **Step 4: Verify deployment scripts compile**

Run:

```powershell
npm run compile
npm run export:abi
```

Expected: compile succeeds and `app/src/contracts/PokerPot.json` contains the exported ABI.

- [ ] **Step 5: Commit deployment scripts**

Run:

```powershell
git add scripts/deploy.ts scripts/export-abi.ts app/src/contracts/deployments.local.json app/src/contracts/PokerPot.json
git commit -m "chore: add deployment and abi export"
```

## Task 7: Frontend Pure Utilities

**Files:**
- Create: `app/src/lib/address.ts`
- Create: `app/src/lib/address.test.ts`
- Create: `app/src/lib/tokenAmount.ts`
- Create: `app/src/lib/tokenAmount.test.ts`
- Create: `app/src/lib/gameView.ts`
- Create: `app/src/lib/gameView.test.ts`

- [ ] **Step 1: Write failing address utility tests**

Write `app/src/lib/address.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeAddressList } from "./address";

describe("normalizeAddressList", () => {
  it("keeps valid addresses, removes duplicates, and preserves first-seen order", () => {
    const result = normalizeAddressList(`
      0x0000000000000000000000000000000000000001
      0x0000000000000000000000000000000000000002
      0x0000000000000000000000000000000000000001
    `);

    expect(result).toEqual({
      addresses: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
      ],
      errors: []
    });
  });

  it("reports invalid address rows", () => {
    const result = normalizeAddressList("not-an-address");

    expect(result.addresses).toEqual([]);
    expect(result.errors).toEqual(["Line 1 is not a valid EVM address."]);
  });
});
```

- [ ] **Step 2: Run address tests to verify RED**

Run:

```powershell
npm --workspace app run test -- src/lib/address.test.ts
```

Expected: FAIL because `app/src/lib/address.ts` is missing.

- [ ] **Step 3: Implement address utilities**

Write `app/src/lib/address.ts`:

```ts
import { getAddress, isAddress } from "viem";

export type AddressListResult = {
  addresses: `0x${string}`[];
  errors: string[];
};

export function normalizeAddressList(input: string): AddressListResult {
  const seen = new Set<string>();
  const addresses: `0x${string}`[] = [];
  const errors: string[] = [];

  input
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) return;
      if (!isAddress(line)) {
        errors.push(`Line ${index + 1} is not a valid EVM address.`);
        return;
      }
      const checksum = getAddress(line);
      const key = checksum.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        addresses.push(checksum);
      }
    });

  return { addresses, errors };
}
```

- [ ] **Step 4: Write failing token amount tests**

Write `app/src/lib/tokenAmount.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatTokenAmount, parseTokenAmount, sumPayoutRows } from "./tokenAmount";

describe("token amount helpers", () => {
  it("parses and formats decimal token values", () => {
    expect(parseTokenAmount("25.5", 6)).toEqual(25_500_000n);
    expect(formatTokenAmount(25_500_000n, 6)).toEqual("25.5");
  });

  it("rejects empty, zero, negative, and over-precision values", () => {
    expect(() => parseTokenAmount("", 6)).toThrow("Enter a token amount.");
    expect(() => parseTokenAmount("0", 6)).toThrow("Amount must be greater than zero.");
    expect(() => parseTokenAmount("-1", 6)).toThrow("Amount must be greater than zero.");
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow("Token amount has too many decimal places.");
  });

  it("sums payout row amounts", () => {
    expect(sumPayoutRows([{ amount: 1n }, { amount: 2n }, { amount: 3n }])).toEqual(6n);
  });
});
```

- [ ] **Step 5: Run token amount tests to verify RED**

Run:

```powershell
npm --workspace app run test -- src/lib/tokenAmount.test.ts
```

Expected: FAIL because `app/src/lib/tokenAmount.ts` is missing.

- [ ] **Step 6: Implement token amount utilities**

Write `app/src/lib/tokenAmount.ts`:

```ts
import { formatUnits, parseUnits } from "viem";

export type PayoutAmountRow = {
  amount: bigint;
};

export function parseTokenAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a token amount.");
  if (trimmed.startsWith("-")) throw new Error("Amount must be greater than zero.");

  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) {
    throw new Error("Token amount has too many decimal places.");
  }

  const parsed = parseUnits(trimmed, decimals);
  if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
  return parsed;
}

export function formatTokenAmount(value: bigint, decimals: number): string {
  const formatted = formatUnits(value, decimals);
  return formatted.replace(/\.0$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function sumPayoutRows(rows: PayoutAmountRow[]): bigint {
  return rows.reduce((total, row) => total + row.amount, 0n);
}
```

- [ ] **Step 7: Write failing game view tests**

Write `app/src/lib/gameView.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveGamePermissions } from "./gameView";

describe("deriveGamePermissions", () => {
  const organiser = "0x0000000000000000000000000000000000000001";
  const player = "0x0000000000000000000000000000000000000002";

  it("enables organiser controls for open games", () => {
    expect(deriveGamePermissions({ connected: organiser, organiser, isOpen: true, isWhitelisted: false, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: true, canFinalize: true });
  });

  it("enables buy-in controls for whitelisted non-organisers", () => {
    expect(deriveGamePermissions({ connected: player, organiser, isOpen: true, isWhitelisted: true, totalPot: 0n }))
      .toEqual({ canBuyIn: true, canManageWhitelist: false, canFinalize: false });
  });

  it("disables all actions for closed games and disconnected users", () => {
    expect(deriveGamePermissions({ connected: undefined, organiser, isOpen: true, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
    expect(deriveGamePermissions({ connected: organiser, organiser, isOpen: false, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
  });
});
```

- [ ] **Step 8: Run game view tests to verify RED**

Run:

```powershell
npm --workspace app run test -- src/lib/gameView.test.ts
```

Expected: FAIL because `app/src/lib/gameView.ts` is missing.

- [ ] **Step 9: Implement game view helper**

Write `app/src/lib/gameView.ts`:

```ts
import { getAddress } from "viem";

type PermissionInput = {
  connected?: string;
  organiser: string;
  isOpen: boolean;
  isWhitelisted: boolean;
  totalPot: bigint;
};

export type GamePermissions = {
  canBuyIn: boolean;
  canManageWhitelist: boolean;
  canFinalize: boolean;
};

function sameAddress(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  return getAddress(left) === getAddress(right);
}

export function deriveGamePermissions(input: PermissionInput): GamePermissions {
  if (!input.connected || !input.isOpen) {
    return { canBuyIn: false, canManageWhitelist: false, canFinalize: false };
  }

  const isOrganiser = sameAddress(input.connected, input.organiser);

  return {
    canBuyIn: input.isWhitelisted,
    canManageWhitelist: isOrganiser,
    canFinalize: isOrganiser && input.totalPot > 0n
  };
}
```

- [ ] **Step 10: Run app utility tests to verify GREEN**

Run:

```powershell
npm --workspace app run test -- src/lib/address.test.ts src/lib/tokenAmount.test.ts src/lib/gameView.test.ts
```

Expected: PASS for all utility tests.

- [ ] **Step 11: Commit frontend utilities**

Run:

```powershell
git add app/src/lib/address.ts app/src/lib/address.test.ts app/src/lib/tokenAmount.ts app/src/lib/tokenAmount.test.ts app/src/lib/gameView.ts app/src/lib/gameView.test.ts
git commit -m "feat: add frontend validation utilities"
```

## Task 8: App Shell And Contract Metadata

**Files:**
- Create: `app/src/contracts/pokerPot.ts`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`
- Create: `app/src/App.test.tsx`
- Create: `app/src/styles.css`

- [ ] **Step 1: Write failing app shell test**

Write `app/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the create-game view by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Create poker pot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run shell test to verify RED**

Run:

```powershell
npm --workspace app run test -- src/App.test.tsx
```

Expected: FAIL because `App.tsx` is missing.

- [ ] **Step 3: Add contract metadata**

Write `app/src/contracts/pokerPot.ts`:

```ts
import pokerPotArtifact from "./PokerPot.json";
import deployments from "./deployments.local.json";

export const pokerPotAbi = pokerPotArtifact.abi;
export const pokerPotAddress = deployments.pokerPot as `0x${string}`;
export const allowlistedTokens = deployments.allowlistedTokens as `0x${string}`[];
export const localMockToken = deployments.mockToken as `0x${string}`;
export const localChainId = deployments.chainId;
```

- [ ] **Step 4: Add app shell**

Write `app/src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { CreateGamePage } from "./pages/CreateGamePage";
import { GamePage } from "./pages/GamePage";
import "./styles.css";

export function App() {
  const [gameId, setGameId] = useState<bigint | undefined>();
  const routeGameId = useMemo(() => {
    const match = window.location.pathname.match(/^\/game\/(\d+)$/);
    return match ? BigInt(match[1]) : gameId;
  }, [gameId]);

  return (
    <main className="app-shell">
      {routeGameId ? (
        <GamePage gameId={routeGameId} />
      ) : (
        <CreateGamePage onCreated={(createdGameId) => setGameId(createdGameId)} />
      )}
    </main>
  );
}
```

Write `app/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Write `app/src/styles.css`:

```css
:root {
  color: #17202f;
  background: #f6f7f9;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 32px;
}

.panel {
  max-width: 920px;
  margin: 0 auto;
}

.stack {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 6px;
}

.field input,
.field textarea,
.field select {
  border: 1px solid #cfd6e1;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.primary-button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  background: #1d4ed8;
  cursor: pointer;
}

.secondary-button {
  border: 1px solid #cfd6e1;
  border-radius: 8px;
  padding: 10px 14px;
  color: #17202f;
  background: #fff;
  cursor: pointer;
}

.error-text {
  color: #b42318;
}

.muted {
  color: #5f6c80;
}
```

- [ ] **Step 5: Run shell test to verify GREEN**

Run:

```powershell
npm --workspace app run test -- src/App.test.tsx
```

Expected: PASS after page components are added in the next task. If this task is run before Task 9 files exist, the expected failure is missing `CreateGamePage` and `GamePage`; continue directly to Task 9 before committing.

## Task 9: Create Game Page

**Files:**
- Create: `app/src/components/AddressListInput.tsx`
- Create: `app/src/components/TokenAmountInput.tsx`
- Create: `app/src/pages/CreateGamePage.tsx`
- Create: `app/src/pages/CreateGamePage.test.tsx`

- [ ] **Step 1: Write failing create page tests**

Write `app/src/pages/CreateGamePage.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateGamePage } from "./CreateGamePage";

describe("CreateGamePage", () => {
  it("blocks creation when buy-in amount is invalid", () => {
    render(<CreateGamePage onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), {
      target: { value: "0x0000000000000000000000000000000000000001" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
  });

  it("blocks creation when whitelist contains invalid addresses", () => {
    render(<CreateGamePage onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "bad-address" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByText("Line 1 is not a valid EVM address.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run create page tests to verify RED**

Run:

```powershell
npm --workspace app run test -- src/pages/CreateGamePage.test.tsx
```

Expected: FAIL because `CreateGamePage.tsx` is missing.

- [ ] **Step 3: Implement reusable inputs**

Write `app/src/components/AddressListInput.tsx`:

```tsx
type AddressListInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function AddressListInput({ label, value, onChange }: AddressListInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
```

Write `app/src/components/TokenAmountInput.tsx`:

```tsx
type TokenAmountInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function TokenAmountInput({ label, value, onChange }: TokenAmountInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
```

- [ ] **Step 4: Implement create page validation**

Write `app/src/pages/CreateGamePage.tsx`:

```tsx
import { useState } from "react";
import { AddressListInput } from "../components/AddressListInput";
import { TokenAmountInput } from "../components/TokenAmountInput";
import { allowlistedTokens } from "../contracts/pokerPot";
import { normalizeAddressList } from "../lib/address";
import { parseTokenAmount } from "../lib/tokenAmount";

type CreateGamePageProps = {
  onCreated: (gameId: bigint) => void;
};

export function CreateGamePage({ onCreated }: CreateGamePageProps) {
  const [token, setToken] = useState(allowlistedTokens[0] ?? "");
  const [buyInAmount, setBuyInAmount] = useState("");
  const [whitelist, setWhitelist] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    setError("");
    try {
      if (!token) throw new Error("Select an allowlisted token.");
      parseTokenAmount(buyInAmount, 6);
      const parsedWhitelist = normalizeAddressList(whitelist);
      if (parsedWhitelist.errors.length > 0) throw new Error(parsedWhitelist.errors[0]);
      if (parsedWhitelist.addresses.length === 0) throw new Error("Add at least one whitelisted address.");
      onCreated(1n);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create game.");
    }
  }

  return (
    <section className="panel stack">
      <div>
        <h1>Create poker pot</h1>
        <p className="muted">Create an ERC-20 poker-night pot for whitelisted wallets.</p>
      </div>

      <label className="field">
        <span>Token</span>
        <select aria-label="Token" value={token} onChange={(event) => setToken(event.target.value)}>
          <option value="">Select token</option>
          {allowlistedTokens.map((address) => (
            <option key={address} value={address}>
              {address}
            </option>
          ))}
        </select>
      </label>

      <TokenAmountInput label="Buy-in amount" value={buyInAmount} onChange={setBuyInAmount} />
      <AddressListInput label="Whitelist addresses" value={whitelist} onChange={setWhitelist} />

      {error ? <p className="error-text">{error}</p> : null}

      <div className="button-row">
        <button className="primary-button" type="button" onClick={handleSubmit}>
          Create game
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run create page and app shell tests**

Run:

```powershell
npm --workspace app run test -- src/pages/CreateGamePage.test.tsx src/App.test.tsx
```

Expected: PASS for create page tests and the app shell test after a temporary `GamePage` is added in Task 10.

## Task 10: Game Page And Finalize Form UI Logic

**Files:**
- Create: `app/src/components/FinalizeForm.tsx`
- Create: `app/src/components/FinalizeForm.test.tsx`
- Create: `app/src/pages/GamePage.tsx`
- Create: `app/src/pages/GamePage.test.tsx`

- [ ] **Step 1: Write failing finalize form tests**

Write `app/src/components/FinalizeForm.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinalizeForm } from "./FinalizeForm";

describe("FinalizeForm", () => {
  it("disables finalization when payout total does not equal pot", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Recipient 1"), {
      target: { value: "0x0000000000000000000000000000000000000001" }
    });
    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "0.000099" } });

    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
    expect(screen.getByText("Remaining: 0.000001")).toBeInTheDocument();
  });

  it("submits parsed payout rows when total equals pot", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fireEvent.change(screen.getByLabelText("Recipient 1"), {
      target: { value: "0x0000000000000000000000000000000000000001" }
    });
    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "0.0001" } });
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    expect(onFinalize).toHaveBeenCalledWith([
      {
        recipient: "0x0000000000000000000000000000000000000001",
        amount: 100n
      }
    ]);
  });
});
```

- [ ] **Step 2: Run finalize form tests to verify RED**

Run:

```powershell
npm --workspace app run test -- src/components/FinalizeForm.test.tsx
```

Expected: FAIL because `FinalizeForm.tsx` is missing.

- [ ] **Step 3: Implement finalize form**

Write `app/src/components/FinalizeForm.tsx`:

```tsx
import { useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { formatTokenAmount, parseTokenAmount } from "../lib/tokenAmount";

type PayoutInput = {
  recipient: `0x${string}`;
  amount: bigint;
};

type DraftRow = {
  recipient: string;
  amount: string;
};

type FinalizeFormProps = {
  pot: bigint;
  decimals: number;
  onFinalize: (rows: PayoutInput[]) => void;
};

export function FinalizeForm({ pot, decimals, onFinalize }: FinalizeFormProps) {
  const [rows, setRows] = useState<DraftRow[]>([{ recipient: "", amount: "" }]);

  const parsed = useMemo(() => {
    const payouts: PayoutInput[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      if (!isAddress(row.recipient)) {
        errors.push("Enter a valid recipient address.");
        continue;
      }
      try {
        payouts.push({
          recipient: getAddress(row.recipient),
          amount: parseTokenAmount(row.amount, decimals)
        });
      } catch (caught) {
        errors.push(caught instanceof Error ? caught.message : "Invalid payout amount.");
      }
    }
    return { payouts, errors };
  }, [rows, decimals]);

  const total = parsed.payouts.reduce((sum, row) => sum + row.amount, 0n);
  const remaining = pot - total;
  const canSubmit = parsed.errors.length === 0 && total === pot;

  return (
    <section className="stack">
      <h2>Finalize payouts</h2>
      {rows.map((row, index) => (
        <div className="button-row" key={index}>
          <label className="field">
            <span>Recipient {index + 1}</span>
            <input
              aria-label={`Recipient ${index + 1}`}
              value={row.recipient}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], recipient: event.target.value };
                setRows(next);
              }}
            />
          </label>
          <label className="field">
            <span>Amount {index + 1}</span>
            <input
              aria-label={`Amount ${index + 1}`}
              inputMode="decimal"
              value={row.amount}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], amount: event.target.value };
                setRows(next);
              }}
            />
          </label>
        </div>
      ))}
      <p className={remaining === 0n ? "muted" : "error-text"}>Remaining: {formatTokenAmount(remaining, decimals)}</p>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => setRows([...rows, { recipient: "", amount: "" }])}>
          Add payout row
        </button>
        <button className="primary-button" type="button" disabled={!canSubmit} onClick={() => onFinalize(parsed.payouts)}>
          Finalize payouts
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write failing game page tests**

Write `app/src/pages/GamePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamePage } from "./GamePage";

describe("GamePage", () => {
  it("shows the game id and buy-in controls", () => {
    render(<GamePage gameId={1n} />);

    expect(screen.getByRole("heading", { name: "Game #1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy in" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run game page test to verify RED**

Run:

```powershell
npm --workspace app run test -- src/pages/GamePage.test.tsx
```

Expected: FAIL because `GamePage.tsx` is missing.

- [ ] **Step 6: Implement static game page shell**

Write `app/src/pages/GamePage.tsx`:

```tsx
import { FinalizeForm } from "../components/FinalizeForm";

type GamePageProps = {
  gameId: bigint;
};

export function GamePage({ gameId }: GamePageProps) {
  return (
    <section className="panel stack">
      <div>
        <h1>Game #{gameId.toString()}</h1>
        <p className="muted">Open poker pot</p>
      </div>

      <section className="stack">
        <h2>Buy in</h2>
        <p>Buy-ins: 0</p>
        <button className="primary-button" type="button">
          Buy in
        </button>
      </section>

      <section className="stack">
        <h2>Whitelist</h2>
        <p className="muted">Organiser controls appear when the connected wallet owns this game.</p>
      </section>

      <FinalizeForm pot={0n} decimals={6} onFinalize={() => undefined} />
    </section>
  );
}
```

- [ ] **Step 7: Run UI tests to verify GREEN**

Run:

```powershell
npm --workspace app run test -- src/App.test.tsx src/pages/CreateGamePage.test.tsx src/components/FinalizeForm.test.tsx src/pages/GamePage.test.tsx
```

Expected: PASS for all current UI tests.

- [ ] **Step 8: Commit UI shell**

Run:

```powershell
git add app/src/contracts/pokerPot.ts app/src/main.tsx app/src/App.tsx app/src/App.test.tsx app/src/styles.css app/src/components/AddressListInput.tsx app/src/components/TokenAmountInput.tsx app/src/components/FinalizeForm.tsx app/src/components/FinalizeForm.test.tsx app/src/pages/CreateGamePage.tsx app/src/pages/CreateGamePage.test.tsx app/src/pages/GamePage.tsx app/src/pages/GamePage.test.tsx
git commit -m "feat: add poker pot app shell"
```

## Task 11: Wagmi Contract Wiring

**Files:**
- Create: `app/src/hooks/usePokerPot.ts`
- Modify: `app/src/main.tsx`
- Modify: `app/src/pages/CreateGamePage.tsx`
- Modify: `app/src/pages/GamePage.tsx`

- [ ] **Step 1: Add Wagmi provider setup**

Modify `app/src/main.tsx`:

```tsx
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { hardhat } from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { App } from "./App";

const config = getDefaultConfig({
  appName: "Web3 Poker Pot",
  projectId: "local-development",
  chains: [hardhat],
  ssr: false
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Create contract hook wrapper**

Write `app/src/hooks/usePokerPot.ts`:

```ts
import { useReadContract, useWriteContract } from "wagmi";
import { pokerPotAbi, pokerPotAddress } from "../contracts/pokerPot";

export function usePokerPotGame(gameId: bigint) {
  const game = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getGame",
    args: [gameId]
  });

  const whitelist = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getWhitelist",
    args: [gameId]
  });

  const participants = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getParticipants",
    args: [gameId]
  });

  return { game, whitelist, participants };
}

export function usePokerPotWrites() {
  const write = useWriteContract();

  return {
    ...write,
    createGame: (token: `0x${string}`, buyInAmount: bigint, whitelist: `0x${string}`[]) =>
      write.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "createGame",
        args: [token, buyInAmount, whitelist]
      }),
    buyIn: (gameId: bigint, count: bigint) =>
      write.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "buyIn",
        args: [gameId, count]
      }),
    setWhitelist: (gameId: bigint, account: `0x${string}`, allowed: boolean) =>
      write.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "setWhitelist",
        args: [gameId, account, allowed]
      }),
    finalize: (gameId: bigint, recipients: `0x${string}`[], amounts: bigint[]) =>
      write.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "finalize",
        args: [gameId, recipients, amounts]
      })
  };
}
```

- [ ] **Step 3: Replace create page callback with contract write**

Modify `app/src/pages/CreateGamePage.tsx` so `handleSubmit` calls `usePokerPotWrites().createGame` after validation:

```tsx
const pokerPot = usePokerPotWrites();
```

Inside `handleSubmit`, replace `onCreated(1n);`:

```tsx
const parsedAmount = parseTokenAmount(buyInAmount, 6);
const parsedWhitelist = normalizeAddressList(whitelist);
if (parsedWhitelist.errors.length > 0) throw new Error(parsedWhitelist.errors[0]);
if (parsedWhitelist.addresses.length === 0) throw new Error("Add at least one whitelisted address.");
pokerPot.createGame(token as `0x${string}`, parsedAmount, parsedWhitelist.addresses);
onCreated(1n);
```

Keep `onCreated(1n)` until event parsing is added. It preserves the local route transition for the first app iteration.

- [ ] **Step 4: Read game data in GamePage**

Modify `app/src/pages/GamePage.tsx`:

```tsx
import { usePokerPotGame, usePokerPotWrites } from "../hooks/usePokerPot";
```

Inside the component:

```tsx
const { game, whitelist, participants } = usePokerPotGame(gameId);
const writes = usePokerPotWrites();
const gameData = game.data as readonly [string, string, bigint, number, bigint] | undefined;
```

Render live values when present:

```tsx
<p className="muted">{gameData ? `Pot: ${gameData[4].toString()}` : "Loading game..."}</p>
<button className="primary-button" type="button" onClick={() => writes.buyIn(gameId, 1n)}>
  Buy in
</button>
<p>Whitelist: {Array.isArray(whitelist.data) ? whitelist.data.length : 0}</p>
<p>Participants: {Array.isArray(participants.data) ? participants.data.length : 0}</p>
```

- [ ] **Step 5: Run build and tests**

Run:

```powershell
npm --workspace app run test
npm --workspace app run build
```

Expected: UI tests pass and app build succeeds.

- [ ] **Step 6: Commit contract wiring**

Run:

```powershell
git add app/src/hooks/usePokerPot.ts app/src/main.tsx app/src/pages/CreateGamePage.tsx app/src/pages/GamePage.tsx
git commit -m "feat: wire app to poker pot contract"
```

## Task 12: End-To-End Local Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add usage documentation**

Write `README.md`:

```md
# Web3 Poker Pot

EVM dapp for poker-night organisers to create ERC-20 pots, whitelist participants, accept multiple buy-ins, and finalize exact full-pot payouts.

## Local Development

Install dependencies:

```powershell
npm install
```

Run contract tests:

```powershell
npm run test:contracts
```

Run app tests:

```powershell
npm run test:app
```

Start a local chain:

```powershell
npx hardhat node
```

Deploy locally in another terminal:

```powershell
npm run deploy:local
npm run export:abi
```

Start the app:

```powershell
npm --workspace app run dev
```

The app uses the local Hardhat deployment written to `app/src/contracts/deployments.local.json`.
```
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run compile
npm run test:contracts
npm run test:app
npm run build:app
```

Expected: all commands exit with code 0.

- [ ] **Step 3: Manually verify local app flow**

Run a local chain:

```powershell
npx hardhat node
```

In a second terminal:

```powershell
npm run deploy:local
npm run export:abi
npm --workspace app run dev
```

Expected: Vite prints a local URL. Open it, connect a local wallet account, create a game, approve the mock token if needed, buy in, and finalize a payout matching the pot.

- [ ] **Step 4: Commit documentation and verification updates**

Run:

```powershell
git add README.md app/src/contracts/deployments.local.json app/src/contracts/PokerPot.json
git commit -m "docs: add local development workflow"
```

## Final Verification

Run:

```powershell
npm run compile
npm run test:contracts
npm run test:app
npm run build:app
git status -sb
```

Expected:

- contract compilation succeeds
- all contract tests pass
- all app tests pass
- app production build succeeds
- `git status -sb` shows a clean working tree
