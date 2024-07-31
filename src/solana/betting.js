import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed"
}

export const getBettingProgram = (wallet) => {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new Provider(connection, wallet, opts);
  return new Program(idl, programID, provider);
}

export const initializeBetting = async (wallet) => {
  const program = getBettingProgram(wallet);
  const betAccount = web3.Keypair.generate();

  await program.rpc.initialize({
    accounts: {
      betAccount: betAccount.publicKey,
      user: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    },
    signers: [betAccount],
  });

  return betAccount;
}

export const placeBet = async (wallet, betAccount, amount) => {
  const program = getBettingProgram(wallet);

  await program.rpc.placeBet(new web3.BN(amount), {
    accounts: {
      betAccount: betAccount.publicKey,
      user: wallet.publicKey,
    },
  });
}