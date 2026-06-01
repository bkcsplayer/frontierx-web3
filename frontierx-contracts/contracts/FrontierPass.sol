// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract FrontierPass is ERC721Enumerable, ERC2981, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 100;
    uint256 private constant COMMON_SUPPLY = 60;
    uint256 private constant RARE_SUPPLY = 25;
    uint256 private constant EPIC_SUPPLY = 10;

    uint256 public mintPrice;
    string public baseTokenURI;
    string public placeholderURI;
    bool public revealed;

    uint256 private _nextTokenId = 1;

    // Rarity: 0 = Common, 1 = Rare, 2 = Epic, 3 = Legendary
    mapping(uint256 tokenId => uint8 rarity) public tokenRarity;
    mapping(uint256 slot => uint8 rarityPlusOne) private _raritySlotOverrides;

    event NFTMinted(address indexed to, uint256 tokenId);
    event Revealed(string baseTokenURI);

    constructor(
        uint256 _mintPrice,
        string memory _placeholderURI,
        address royaltyReceiver
    ) ERC721("Frontier Access Pass", "FAP") Ownable(msg.sender) {
        require(_mintPrice > 0, "Mint price required");
        require(bytes(_placeholderURI).length > 0, "Placeholder URI required");
        require(royaltyReceiver != address(0), "Royalty receiver required");

        mintPrice = _mintPrice;
        placeholderURI = _placeholderURI;
        _setDefaultRoyalty(royaltyReceiver, 500); // 5%
    }

    function mint() external payable {
        require(_nextTokenId <= MAX_SUPPLY, "Max supply reached");
        require(!revealed, "Sale closed after reveal");
        require(msg.value == mintPrice, "Incorrect payment");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId);
    }

    function reveal(string memory _realBaseURI) external onlyOwner {
        require(!revealed, "Already revealed");
        require(totalSupply() > 0, "No tokens minted");
        require(bytes(_realBaseURI).length > 0, "Base URI required");

        uint256 supply = totalSupply();
        uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, supply, address(this))));

        for (uint256 i = 0; i < supply; i++) {
            uint256 remaining = MAX_SUPPLY - i;
            uint256 slot = uint256(keccak256(abi.encodePacked(seed, i))) % remaining;
            uint256 lastSlot = remaining - 1;
            uint256 tokenId = tokenByIndex(i);

            tokenRarity[tokenId] = _drawRarity(slot, lastSlot);
        }

        baseTokenURI = _realBaseURI;
        revealed = true;

        emit Revealed(_realBaseURI);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return placeholderURI;
        }

        string memory rarityFolder = _rarityToFolder(tokenRarity[tokenId]);
        return string(abi.encodePacked(baseTokenURI, rarityFolder, "/", tokenId.toString(), ".json"));
    }

    function holdsPass(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{ value: address(this).balance }("");
        require(success, "Withdraw failed");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _drawRarity(uint256 slot, uint256 lastSlot) internal returns (uint8) {
        uint8 rarity = _rarityAtSlot(slot);
        uint8 lastRarity = _rarityAtSlot(lastSlot);

        _raritySlotOverrides[slot] = lastRarity + 1;

        return rarity;
    }

    function _rarityAtSlot(uint256 slot) internal view returns (uint8) {
        uint8 overrideValue = _raritySlotOverrides[slot];
        if (overrideValue != 0) {
            return overrideValue - 1;
        }

        if (slot < COMMON_SUPPLY) return 0;
        if (slot < COMMON_SUPPLY + RARE_SUPPLY) return 1;
        if (slot < COMMON_SUPPLY + RARE_SUPPLY + EPIC_SUPPLY) return 2;
        return 3;
    }

    function _rarityToFolder(uint8 rarity) internal pure returns (string memory) {
        if (rarity == 0) return "common";
        if (rarity == 1) return "rare";
        if (rarity == 2) return "epic";
        return "legendary";
    }
}
