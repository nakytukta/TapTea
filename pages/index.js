import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion"; // For animations

const contractABI = [
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "Claimed",
    type: "event",
  },
];

const contractAddress = "0x01D5a11742b5e819a5517A078d8ce4d9B1c06ac2";
const RPC = "https://tea-sepolia.g.alchemy.com/public";

export default function TapTeaDApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [claimCount, setClaimCount] = useState(0);

  // Connect to Metamask
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
    }
    fetchClaimCountToday();
  }, []);

  // Get 7 AM Bangkok timestamp
  const getStartOfDayTimestamp = () => {
    const now = new Date();
    const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    bangkok.setHours(7, 0, 0, 0);
    return Math.floor(bangkok.getTime() / 1000);
  };

  // Fetch today's claim count
  const fetchClaimCountToday = async () => {
    try {
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
      logs.forEach((log) => uniqueAddresses.add(log.args.user.toLowerCase()));
      setClaimCount(uniqueAddresses.size);
    } catch (err) {
      console.error("Error fetching claim count:", err);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!provider) return;
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSigner(signer);
      setWalletAddress(address);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  // Add Tea Sepolia network
  const addTeaSepoliaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x27EA",
            chainName: "Tea Sepolia Testnet",
            nativeCurrency: {
              name: "TEA",
              symbol: "TEA",
              decimals: 18,
            },
            rpcUrls: ["https://tea-sepolia.g.alchemy.com/public"],
            blockExplorerUrls: ["https://sepolia.tea.xyz/"],
          },
        ],
      });
    } catch (err) {
      console.error("Error adding Tea Sepolia Testnet:", err);
    }
  };

  // Handle claim transaction
  const handleClickTx = async () => {
    if (!signer) return;
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.claim();
      await tx.wait();
      setTxHash(tx.hash);
      fetchClaimCountToday();
    } catch (err) {
      console.error("Transaction error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-950 flex flex-col items-center justify-center p-6 font-sans">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Tap Tea
        </h1>
        <p className="text-lg text-blue-300 mt-2">Claim your daily TEA on the Sepolia Testnet</p>
      </motion.div>

      {/* Wallet Info */}
      <AnimatePresence>
        {walletAddress && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-green-300 text-sm mb-4 bg-gray-800 px-4 py-2 rounded-full"
          >
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Main Action Button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center space-y-6"
      >
        {walletAddress ? (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClickTx}
              className="w-64 h-64 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-white text-3xl font-bold shadow-2xl flex items-center justify-center relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-8 w-8 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
              ) : (
                "TAP"
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-20 animate-pulse"></div>
            </motion.button>
            <AnimatePresence>
              {txHash && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-400"
                >
                  TX Hash:{" "}
                  <a
                    href={`https://sepolia.tea.xyz/tx/${txHash}`}
                    target="_blank"
                    className="underline hover:text-green-300"
                    rel="noreferrer"
                  >
                    {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  </a>
                </motion.p>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="bg-green-500 text-black font-semibold text-lg px-10 py-4 rounded-xl shadow-lg shadow-green-500/50 hover:bg-green-400 transition-all"
          >
            Connect Wallet
          </motion.button>
        )}
      </motion.div>

      {/* Footer Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="fixed bottom-6 flex justify-center w-full gap-4"
      >
        <button
          onClick={addTeaSepoliaNetwork}
          className="bg-yellow-500 text-black text-sm px-6 py-3 rounded-xl hover:bg-yellow-400 shadow-md transition-all"
        >
          Add Tea Sepolia
        </button>
        <a
          href="https://faucet-sepolia.tea.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 text-white text-sm px-6 py-3 rounded-xl hover:bg-purple-500 shadow-md transition-all"
        >
          Get TEA
        </a>
      </motion.div>

      {/* Claim Counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-6 right-6 text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-full shadow-lg"
      >
        Today&apos;s Claims: <span className="font-bold">{claimCount}</span>
      </motion.div>
    </div>
  );
}