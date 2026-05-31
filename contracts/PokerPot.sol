// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PokerPot is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

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
    error NotWhitelisted();
    error InvalidBuyInCount();
    error TokenTransferAmountMismatch();
    error InvalidPayouts();
    error PayoutTotalMismatch();

    uint256 public nextGameId = 1;

    mapping(address => bool) private allowedTokens;
    mapping(uint256 => Game) private games;
    mapping(uint256 => mapping(address => bool)) public isWhitelisted;
    mapping(uint256 => mapping(address => uint256)) private whitelistIndexPlusOne;
    mapping(uint256 => mapping(address => uint256)) public buyInCount;
    mapping(uint256 => mapping(address => bool)) private hasParticipated;

    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event GameCreated(uint256 indexed gameId, address indexed organiser, address indexed token, uint256 buyInAmount);
    event WhitelistUpdated(uint256 indexed gameId, address indexed account, bool allowed);
    event BuyIn(uint256 indexed gameId, address indexed participant, uint256 count, uint256 amount);
    event GameFinalized(uint256 indexed gameId, uint256 totalPaid);

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

    function buyIn(uint256 gameId, uint256 count) external nonReentrant {
        Game storage game = _requireGame(gameId);
        if (game.status != GameStatus.Open) revert GameClosed();
        if (count == 0) revert InvalidBuyInCount();
        if (!isWhitelisted[gameId][msg.sender]) revert NotWhitelisted();

        uint256 amount = game.buyInAmount * count;
        IERC20 token = IERC20(game.token);
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = token.balanceOf(address(this));
        if (balanceAfter < balanceBefore || balanceAfter - balanceBefore != amount) {
            revert TokenTransferAmountMismatch();
        }

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

    function finalize(uint256 gameId, address[] calldata recipients, uint256[] calldata amounts) external nonReentrant {
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
