import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import { FaWallet, FaFaucet, FaNetworkWired } from "react-icons/fa"; // Icons

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

export default function ClickToTxDApp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [claimCount, setClaimCount] = useState(0);

  // Initialize provider and fetch claim count
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

  // Fetch daily claim count
  const fetchClaimCountToday = async () => {
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

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x27EA" }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await addTeaSepoliaNetwork();
        } else {
          console.error("Switch chain error:", switchError);
        }
      }
    } catch (err) {
      console.error("Wallet conectar:", err);
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
            nativeCurrency: { name: "TEA", symbol: "TEA", decimals: 18 },
            rpcUrls: ["https://tea-sepolia.g.alchemy.com/public"],
            blockExplorerUrls: ["https://sepolia.tea.xyz/"],
          },
        ],
      });
    } catch (err) {
      console.error("Error adding Tea Sepolia:", err);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6 font-sans">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8"
      >
        Tap Tea
      </motion.h1>

      {/* Wallet Address */}
      <AnimatePresence>
        {walletAddress && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-cyan-300 mb-4 flex items-center gap-2"
          >
            <FaWallet /> Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Main Action Button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        {walletAddress ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClickTx}
            disabled={isLoading}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden
              ${isLoading ? "bg-gray-500 cursor-not-allowed" : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"}`}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-8 w-8 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              "Tap"
            )}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:from-green-300 hover:to-green-500 flex items-center gap-2"
          >
            <FaWallet /> Connect Wallet
          </motion.button>
        )}
      </motion.div>

      {/* Transaction Hash */}
      <AnimatePresence>
        {txHash && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-sm text-green-400"
          >
            TX Hash:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-green-300"
            >
              {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </a>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="fixed bottom-6 left-6 flex gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={addTeaSepoliaNetwork}
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:from-yellow-300 hover:to-yellow-500"
        >
          <FaNetworkWired /> Add Tea Sepolia
        </motion.button>
        <a
          href="https://faucet-sepolia.tea.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:from-purple-400 hover:to-purple-600"
        >
          <FaFaucet /> Get TEA
        </a>
      </motion.div>

      {/* Claim Count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="fixed bottom-6 right-6 bg-gray-800 bg-opacity-80 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        Today&apos;s Claims: <span className="font-bold text-cyan-400">{claimCount}</span>
      </motion.div>
    </div>
  );
}
