let web3;
let contract;
const contractAddress = "0xe825E30cda7043048879710554Bf437b739c6d49";
let registeredUsers = {};
let countdownInterval;

window.onload = async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });

        const response = await fetch("../build/contracts/Auction.json");
        const contractABI = await response.json();
        contract = new web3.eth.Contract(contractABI.abi, contractAddress);

        updateAuctionStatus();
    } else {
        alert("MetaMask not installed!");
    }
};

async function registerUser() {
    const username = document.getElementById("username").value.trim();
    const userAddress = document.getElementById("userAddress").value.trim();

    if (!web3.utils.isAddress(userAddress)) {
        alert("Invalid wallet address!");
        return;
    }

    if (registeredUsers[userAddress]) {
        alert("This address is already registered!");
        return;
    }

    registeredUsers[userAddress] = username;

    const select = document.getElementById("bidderSelect");
    const option = document.createElement("option");
    option.value = userAddress;
    option.textContent = `${username}`;
    select.appendChild(option);

    const userList = document.getElementById("userList");
    const li = document.createElement("li");
    li.textContent = `${username}`;
    userList.appendChild(li);

    document.getElementById("status").innerText = `User ${username} registered!`;
}

async function createAuction() {
    try {
        const accounts = await web3.eth.getAccounts();
        const isActive = await contract.methods.active().call();

        if (isActive) {
            alert("An auction is already active! End or cancel it first.");
            return;
        }

        const itemName = document.getElementById("itemName").value.trim();
        const minBid = web3.utils.toWei(document.getElementById("minBid").value, "ether");
        const duration = document.getElementById("duration").value;

        await contract.methods.startAuction(itemName, minBid, duration)
            .send({ from: accounts[0] });

        document.getElementById("status").innerText = "Auction Created!";
        updateAuctionStatus();
    } catch (error) {
        console.error("Auction creation error:", error);
        alert("Error: " + error.message);
    }
}

async function placeBid() {
    try {
        const bidderAddress = document.getElementById("bidderSelect").value;
        const bidAmount = web3.utils.toWei(document.getElementById("bidAmount").value, "ether");

        if (!bidderAddress) {
            alert("Select a registered user to place a bid.");
            return;
        }

        await contract.methods.placeBid()
            .send({ from: bidderAddress, value: bidAmount });

        document.getElementById("status").innerText = `Bid placed by ${registeredUsers[bidderAddress]}!`;
        updateAuctionStatus();
    } catch (error) {
        console.error("Bid error:", error);
        alert("Error: " + error.message);
    }
}

async function endAuction() {
    try {
        const accounts = await web3.eth.getAccounts();
        await contract.methods.endAuction().send({ from: accounts[0] });

        document.getElementById("status").innerText = "Auction Ended!";
        updateAuctionStatus();
    } catch (error) {
        console.error("End Auction error:", error);
        alert("Error: " + error.message);
    }
}

async function cancelAuction() {
    try {
        const accounts = await web3.eth.getAccounts();
        await contract.methods.cancelAuction().send({ from: accounts[0] });

        document.getElementById("status").innerText = "Auction Canceled!";
        updateAuctionStatus();
    } catch (error) {
        console.error("Cancel Auction error:", error);
        alert("Error: " + error.message);
    }
}

function startCountdown(endTime) {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remainingTime = endTime - now;

        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            document.getElementById("timer").innerText = "Auction Ended";
            return;
        }

        const days = Math.floor(remainingTime / 86400);
        const hours = Math.floor((remainingTime % 86400) / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        document.getElementById("timer").innerText = `Time Remaining: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

async function updateAuctionStatus() {
    try {
        const itemName = await contract.methods.itemName().call();
        const highestBid = await contract.methods.highestBid().call();
        const highestBidder = await contract.methods.highestBidder().call();
        const isActive = await contract.methods.active().call();
        const owner = await contract.methods.owner().call();
        const ownerBalance = await web3.eth.getBalance(owner);
        const endTime = await contract.methods.endTime().call();

        if (document.getElementById("auctionItem")) {
            document.getElementById("auctionItem").innerText = itemName;
        }
        if (document.getElementById("auctionStatus")) {
            document.getElementById("auctionStatus").innerText = isActive ? "Auction Active" : "Auction Ended";
        }
        if (document.getElementById("highestBid")) {
            document.getElementById("highestBid").innerText = `${web3.utils.fromWei(highestBid, "ether")} ETH`;
        }
        if (document.getElementById("highestBidder")) {
            document.getElementById("highestBidder").innerText = registeredUsers[highestBidder] || "None";
        }
        if (document.getElementById("ownerBalance")) {
            document.getElementById("ownerBalance").innerText = `${web3.utils.fromWei(ownerBalance, "ether")} ETH`;
        }
        
        if (isActive) {
            startCountdown(parseInt(endTime));
        } else {
            clearInterval(countdownInterval);
            document.getElementById("timer").innerText = "Auction Ended";
        }

    } catch (error) {
        console.error("Update error:", error);
    }
}
