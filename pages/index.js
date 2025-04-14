import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import { toast, Toaster } from "react-hot-toast"; // For notifications
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
    if (typeof window !== "undefined" && window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
    }
    fetchClaimCountToday();
  }, []);

  const getStartOfDayTimestamp = () => {
    const now = new Date();
    const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    bangkok.setHours(7, 0, 0, 0);
    return Math.floor(bangkok.getTime() / 1000);
  };

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
      const uniqueAddresses = new Set(logs.map((log) => log.args.user.toLowerCase()));
      setClaimCount(uniqueAddresses.size);
    } catch (err) {
      console.error("Error fetching claim count:", err);
      toast.error("Failed to fetch claim count");
    }
  };

  const connectWallet = async () => {
    try {
      if (!provider) {
        toast.error("No wallet detected. Please install MetaMask.");
        return;
      }

      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSigner(signer);
      setWalletAddress(address);
      toast.success("Wallet connected!");

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x27EA" }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await addTeaSepoliaNetwork();
        } else {
          toast.error("Failed to switch chain");
          console.error("Switch chain error:", switchError);
        }
      }
    } catch (err) {
      toast.error("Wallet connection failed");
      console.error("Wallet connection error:", err);
    }
  };

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
      toast.success("Tea Sepolia added to MetaMask!");
    } catch (err) {
      toast.error("Failed to add Tea Sepolia network");
      console.error("Error adding Tea Sepolia:", err);
    }
  };

  const handleClickTx = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }
    setIsLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx = await contract.claim();
      await tx.wait();
      setTxHash(tx.hash);
      toast.success("Claim successful!");
      fetchClaimCountToday();
    } catch (err) {
      toast.error("Transaction failed");
      console.error("Transaction error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6 font-sans">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Tap Tea
        </h1>
        <p className="mt-2 text-gray-300 text-lg">Claim your daily TEA on the Sepolia Testnet!</p>
      </motion.div>

      {/* Wallet Info */}
      <AnimatePresence>
        {walletAddress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-6 bg-gray-800 bg-opacity-50 p-4 rounded-xl shadow-lg"
          >
            <p className="text-green-300 text-sm flex items-center gap-2">
              <FaWallet /> Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interaction */}
      <motion.div
        className="flex flex-col items-center space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Image
            src="/tealogo.jpg"
            alt="Tap Logo"
            width={200}
            height={200}
            className="rounded-full shadow-2xl border-4 border-cyan-500"
            onClick={handleClickTx}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </motion.div>

        {txHash && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-green-400"
          >
            TX Hash:{" "}
            <a
              href={`https://sepolia.tea.xyz/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-green-300"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </motion.p>
        )}

        {!walletAddress ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg px-8 py-4 rounded-xl shadow-lg flex items-center gap-2"
          >
            <FaWallet /> Connect Wallet
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClickTx}
            disabled={isLoading}
            className={`bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-lg px-8 py-4 rounded-xl shadow-lg flex items-center gap-2 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Claiming..." : "Claim TEA"}
          </motion.button>
        )}
      </motion.div>

      {/* Footer Actions */}
      <motion.div
        className="fixed bottom-6 left-0 right-0 flex justify-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={addTeaSepoliaNetwork}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-sm px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
        >
          <FaNetworkWired /> Add Tea Sepolia
        </motion.button>
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="https://faucet-sepolia.tea.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
        >
          <FaFaucet /> Get TEA
        </motion.a>
      </motion.div>

      {/* Claim Count */}
      <motion.div
        className="fixed bottom-6 right-6 bg-gray-800 bg-opacity-70 text-white text-xs px-4 py-2 rounded-full shadow-lg"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        Today&apos;s Claims: <span className="font-bold text-cyan-400">{claimCount}</span>
      </motion.div>
    </div>
  );
}