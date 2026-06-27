// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PortXGenesisNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    uint256 public constant ABSOLUTE_MAX_SUPPLY = 250000;
    uint256 public constant MAX_MINTS_PER_TX = 5;

    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public goPublic;

    string public metadataURI;
    uint256 private tokenIdCounter = 1;

    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public howMany;

    event NFTMinted(address indexed recipient, uint256 tokenId, uint8 nftType);
    event MintedIds(address indexed recipient, uint256[] ids);
    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 oldSupply, uint256 newSupply);
    event GoPublicSet(bool isPublic);
    event MetadataURIUpdated(string newURI);

    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory initialMetadataURI,
        uint256 initialMintPrice,
        uint256 initialMaxSupply
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        require(initialOwner != address(0), "Invalid owner");
        require(bytes(initialMetadataURI).length > 0, "Metadata URI required");
        require(initialMaxSupply > 0, "Max supply required");
        require(initialMaxSupply <= ABSOLUTE_MAX_SUPPLY, "Above absolute max");

        metadataURI = initialMetadataURI;
        mintPrice = initialMintPrice;
        maxSupply = initialMaxSupply;
        goPublic = false;
    }

    function mint(uint256 quantity) external payable returns (uint256[] memory) {
        return mintNFT(msg.sender, quantity);
    }

    function mintNFT(address to, uint256 quantity)
        public
        payable
        nonReentrant
        returns (uint256[] memory)
    {
        require(goPublic, "Public mint not live");
        require(to != address(0), "Invalid recipient");
        require(quantity > 0 && quantity <= MAX_MINTS_PER_TX, "Invalid quantity");
        require(totalSupply() + quantity <= maxSupply, "Max supply reached");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");

        uint256[] memory ids = _mintBatch(to, quantity);

        uint256 overpay = msg.value - (mintPrice * quantity);
        if (overpay > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: overpay}("");
            require(refunded, "Refund failed");
        }

        return ids;
    }

    function whiteMint() external nonReentrant returns (uint256[] memory) {
        require(whitelisted[msg.sender], "Not whitelisted");
        require(howMany[msg.sender] > 0, "No whitelist mints left");
        require(totalSupply() + 1 <= maxSupply, "Max supply reached");

        howMany[msg.sender] -= 1;

        if (howMany[msg.sender] == 0) {
            whitelisted[msg.sender] = false;
        }

        return _mintBatch(msg.sender, 1);
    }

    function ownerMint(address to, uint256 quantity)
        external
        onlyOwner
        returns (uint256[] memory)
    {
        require(to != address(0), "Invalid recipient");
        require(quantity > 0, "Invalid quantity");
        require(totalSupply() + quantity <= maxSupply, "Max supply reached");

        return _mintBatch(to, quantity);
    }

    function _mintBatch(address to, uint256 quantity)
        internal
        returns (uint256[] memory)
    {
        uint256[] memory ids = new uint256[](quantity);

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = tokenIdCounter;
            tokenIdCounter++;

            ids[i] = tokenId;

            _safeMint(to, tokenId);

            // nftType is always 0 now, kept for old frontend event compatibility.
            emit NFTMinted(to, tokenId, 0);
        }

        emit MintedIds(to, ids);
        return ids;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        ownerOf(tokenId);
        return metadataURI;
    }

    function walletOfOwner(address owner_)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = balanceOf(owner_);
        uint256[] memory ids = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            ids[i] = tokenOfOwnerByIndex(owner_, i);
        }

        return ids;
    }

    function setMetadataURI(string memory newURI) external onlyOwner {
        require(bytes(newURI).length > 0, "Metadata URI required");
        metadataURI = newURI;
        emit MetadataURIUpdated(newURI);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function setMaxSupply(uint256 newSupply) external onlyOwner {
        require(newSupply >= totalSupply(), "Below current supply");
        require(newSupply <= ABSOLUTE_MAX_SUPPLY, "Above absolute max");

        uint256 oldSupply = maxSupply;
        maxSupply = newSupply;

        emit MaxSupplyUpdated(oldSupply, newSupply);
    }

    function setGoPublic(bool isPublic) external onlyOwner {
        goPublic = isPublic;
        emit GoPublicSet(isPublic);
    }

    function addFreeWhitelistUserOrAddMoreSpots(address user, uint256 spots)
        external
        onlyOwner
    {
        require(user != address(0), "Invalid user");
        require(spots > 0, "Invalid spots");

        whitelisted[user] = true;
        howMany[user] += spots;
    }

    function addFreeWhitelistUsers(address[] calldata users, uint256 spotsEach)
        external
        onlyOwner
    {
        require(spotsEach > 0, "Invalid spots");

        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user");

            whitelisted[users[i]] = true;
            howMany[users[i]] += spotsEach;
        }
    }

    function removeFreeWhitelistUser(address user) external onlyOwner {
        whitelisted[user] = false;
        howMany[user] = 0;
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
