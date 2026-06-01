// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FRXToken is ERC20, Ownable {
    address public stakingContract;
    uint256 public totalMinted;
    uint256 public totalBurned;
    uint256 public totalTreasuryDeposited;
    address public treasuryWallet;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event TreasuryDeposit(address indexed from, uint256 amount);
    event StakingContractUpdated(address indexed newContract);

    constructor(address _treasuryWallet) ERC20("FrontierX Token", "FRX") Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Treasury wallet required");
        treasuryWallet = _treasuryWallet;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingContract, "Only staking contract");
        _mint(to, amount);
        totalMinted += amount;
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }

    function depositToTreasury(uint256 amount) external {
        _transfer(msg.sender, treasuryWallet, amount);
        totalTreasuryDeposited += amount;
        emit TreasuryDeposit(msg.sender, amount);
    }

    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Staking contract required");
        stakingContract = _staking;
        emit StakingContractUpdated(_staking);
    }

    function treasuryBalance() public view returns (uint256) {
        return balanceOf(treasuryWallet);
    }

    function circulatingSupply() external view returns (uint256) {
        return totalSupply() - treasuryBalance();
    }
}
