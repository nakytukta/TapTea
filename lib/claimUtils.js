import { ethers } from "ethers";
import { contractAddress, contractABI, RPC } from "./config";

export const getStartOfDayTimestamp = () => {
  const now = new Date();
  const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bangkok.setHours(7, 0, 0, 0);
  return Math.floor(bangkok.getTime() / 1000);
};

const findStartBlock = async (rpcProvider, targetTimestamp, latestBlock) => {
  let low = Math.max(0, latestBlock - 5000);
  let high = latestBlock;

  const lowBlock = await rpcProvider.getBlock(low);
  if (lowBlock.timestamp >= targetTimestamp) return low;

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    const block = await rpcProvider.getBlock(mid);
    if (block.timestamp >= targetTimestamp) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
};

export const fetchClaimCountToday = async (setClaimCount, setError) => {
  try {
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(contractAddress, contractABI, rpcProvider);
    const targetTimestamp = getStartOfDayTimestamp();
    const latestBlock = await rpcProvider.getBlockNumber();

    const fromBlock = await findStartBlock(rpcProvider, targetTimestamp, latestBlock);

    const logs = await contract.queryFilter("Claimed", fromBlock, "latest");
    const uniqueAddresses = new Set(logs.map((log) => log.args.user.toLowerCase()));

    setClaimCount(uniqueAddresses.size);
  } catch (err) {
    console.error("Failed to fetch claim count:", err);
    if (setError) setError("ไม่สามารถโหลดข้อมูล claim ได้");
  }
};
