import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import idl from './idl.json';

// You should replace this with your actual program ID
const PROGRAM_ID = "HGFphfyNk9mZaCFCSzdM9ERtqreWnSswQbPY7oqw8985";

let programId;
try {
  programId = new PublicKey(idl.metadata.address);
} catch (e) {
  console.warn("Failed to load program ID from IDL file. Using default ID.");
  programId = new PublicKey(PROGRAM_ID);
}

const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed"
}

export const getBettingProgram = (wallet) => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new AnchorProvider(connection, wallet, opts);
  return new Program(idl, programId, provider);
}

export const initializeBetting = async (wallet) => {
  const program = getBettingProgram(wallet);
  const betAccount = Keypair.generate();

  try {
    await program.methods.initialize()
      .accounts({
        betAccount: betAccount.publicKey,
        user: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([betAccount])
      .rpc();
    return betAccount;
  } catch (error) {
    console.error("Error initializing betting:", error);
    throw error;
  }
}

export const placeBet = async (wallet, betAccount, amount) => {
  const program = getBettingProgram(wallet);

  try {
    await program.methods.placeBet(new BN(amount))
      .accounts({
        betAccount: betAccount.publicKey,
        user: wallet.publicKey,
      })
      .rpc();
  } catch (error) {
    console.error("Error placing bet:", error);
    throw error;
  }
}