// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Auction 
{
    address payable public owner;
    string public itemName;
    uint256 public minBid;
    uint256 public endTime;
    bool public active;
    address public highestBidder;
    uint256 public highestBid;
    mapping(address => uint256) public bids;
    address[] private bidders;
    
    event AuctionStarted(string itemName, uint256 minBid, uint256 endTime);
    event NewBid(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    event AuctionCancelled();
    
    modifier onlyOwner() 
    {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() 
    {
        owner = payable(msg.sender);
    }
    
    function startAuction(string memory _itemName, uint256 _minBid, uint256 _duration) external onlyOwner 
    {
        require(!active, "Finish current auction first!");
        require(address(this).balance == 0, "Contract should not hold ETH!");
        
        itemName = _itemName;
        minBid = _minBid;
        endTime = block.timestamp + (_duration * 1 days);
        active = true;
        highestBidder = address(0);
        highestBid = 0;
        
        for (uint256 i = 0; i < bidders.length; i++) 
        {
            bids[bidders[i]] = 0;
        }
        delete bidders;
        
        emit AuctionStarted(itemName, minBid, endTime);
    }
    
    function placeBid() external payable 
    {
        require(active, "No active auction");
        require(block.timestamp < endTime, "Auction ended");
        require(msg.value > highestBid && msg.value >= minBid, "Bid too low");
        
        if (highestBidder != address(0)) 
        {
            (bool refundSuccess, ) = payable(highestBidder).call{value: highestBid}("");
            require(refundSuccess, "Refund failed");
        }
        
        highestBidder = msg.sender;
        highestBid = msg.value;
        bids[msg.sender] = msg.value;
        bidders.push(msg.sender);
        
        emit NewBid(msg.sender, msg.value);
    }
    
    function endAuction() external onlyOwner 
    {
        require(active, "No active auction");

        active = false;
        
        if (highestBidder != address(0)) 
        {
            uint256 payout = highestBid;

            require(address(this).balance >= payout, "Insufficient contract balance");
            
            address winner = highestBidder;
            highestBid = 0;
            highestBidder = address(0);
            
            (bool success, ) = owner.call{value: payout}("");
            require(success, "ETH Transfer failed");
            
            emit AuctionEnded(winner, payout);
        }
    }
    
    function cancelAuction() external onlyOwner 
    {
        require(active, "No active auction");
        
        active = false;
        
        for (uint256 i = 0; i < bidders.length; i++) 
        {
            address user = bidders[i];
            if (bids[user] > 0) {
                (bool refundSuccess, ) = payable(user).call{value: bids[user]}("");
                require(refundSuccess, "Refund failed");
                bids[user] = 0;
            }
        }
        
        highestBidder = address(0);
        highestBid = 0;
        delete bidders;
        
        emit AuctionCancelled();
    }
    
    receive() external payable 
    {
        revert("This contract does not accept direct ETH payments!");
    }
    
    fallback() external payable 
    {
        revert("Fallback: ETH transfer not allowed!");
    }
}
