import { ethers } from "ethers";
import { contractAddress, contractABI, RPC } from "./config";

export const getStartOfDayTimestamp = () => {
  const now = new Date();
  const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bangkok.setHours(7, 0, 0, 0);
  return Math.floor(bangkok.getTime() / 1000);
};

export const fetchClaimCountToday = async (setClaimCount) => {
  const rpcProvider = new ethers.providers.JsonRpcProvider(RPC);
  const contract = new ethers.Contract(contractAddress, contractABI, rpcProvider);
  const targetTimestamp = getStartOfDayTimestamp();
  const latestBlock = await rpcProvider.getBlockNumber();

  let fromBlock = latestBlock - 5000;
  let found = false;

  while (!found && fromBlock < latestBlock) {
    const block = await rpcProvider.getBlock(fromBlock);
    if (block.timestamp >= targetTimestamp) {
      found = true;
      break;
    }
    fromBlock += 50;
  }

  const logs = await contract.queryFilter("Claimed", fromBlock, "latest");
  const uniqueAddresses = new Set();

  logs.forEach((log) => {
    uniqueAddresses.add(log.args.user.toLowerCase());
  });

  setClaimCount(uniqueAddresses.size);
};
