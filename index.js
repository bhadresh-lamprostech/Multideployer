require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

const mainPrivateKey = process.env.MAIN_PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(
  `https://polygon-amoy.g.alchemy.com/v2/ALbcNieoFrIRYYNDrcr4dAASXUCZbm-i`
);

const mainWallet = new ethers.Wallet(mainPrivateKey, provider);

const numAccounts = 20; // Number of accounts to generate
const initialFundAmount = ethers.parseEther("0.3"); // Amount of ETH to transfer to each account

// Contract ABI and bytecode (replace with actual ABI and bytecode)
const creatorTokenABI = require("./token.json").abi;
const creatorTokenBytecode = require("./token.json").bytecode; // Bytecode of CreatorToken contract

const creatorPlatformABI = require("./creator.json").abi;
const creatorPlatformBytecode = require("./creator.json").bytecode; // Bytecode of CreatorPlatform contract

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function generateAccounts() {
  let accounts = [];
  for (let i = 0; i < numAccounts; i++) {
    const wallet = ethers.Wallet.createRandom();
    accounts.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  }
  return shuffleArray(accounts); // Randomize order of accounts
}

async function fundAccounts(accounts) {
  for (let account of accounts) {
    const tx = {
      to: account.address,
      value: initialFundAmount,
    };

    const txResponse = await mainWallet.sendTransaction(tx);
    await txResponse.wait();
    console.log(`Funded ${account.address}`);

    // Random delay between 2 to 3 seconds
    await delay(Math.floor(Math.random() * 1000) + 2000);
  }
}

async function deployContracts(accounts) {
  let deployments = [];

  for (let account of accounts) {
    const wallet = new ethers.Wallet(account.privateKey, provider);

    // Deploy CreatorToken first
    const tokenFactory = new ethers.ContractFactory(
      creatorTokenABI,
      creatorTokenBytecode,
      wallet
    );
    const tokenContract = await tokenFactory.deploy(
      ethers.parseEther("1000000")
    ); // Initial supply
    await tokenContract.waitForDeployment();
    console.log(
      `CreatorToken deployed by ${
        account.address
      } at ${await tokenContract.getAddress()}`
    );

    // Random delay between 2 to 3 seconds
    await delay(Math.floor(Math.random() * 1000) + 2000);

    // Deploy CreatorPlatform with the CreatorToken address
    const platformFactory = new ethers.ContractFactory(
      creatorPlatformABI,
      creatorPlatformBytecode,
      wallet
    );
    const platformContract = await platformFactory.deploy(
      await tokenContract.getAddress()
    );
    await platformContract.waitForDeployment(); // Wait for deployment
    console.log(
      `CreatorPlatform deployed by ${
        account.address
      } at ${await platformContract.getAddress()}`
    );

    deployments.push({
      address: account.address,
      privateKey: account.privateKey,
      tokenAddress: await tokenContract.getAddress(),
      platformAddress: await platformContract.getAddress(),
    });

    // Random delay between 2 to 3 seconds
    await delay(Math.floor(Math.random() * 1000) + 2000);
  }

  return deployments;
}

(async function main() {
  try {
    const accounts = await generateAccounts();
    console.log("Generated Accounts:", accounts);

    await fundAccounts(accounts);

    const deployments = await deployContracts(accounts);

    // Write deployments to a JSON file
    fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
    console.log("Deployments saved to deployments.json");
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
