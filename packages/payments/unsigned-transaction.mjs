// Only signs the exact pre-estimated native message; no RPC or keys are loaded.
export async function signPreparedWire({kit,plan,signers}) {
  if(!plan.unsignedWireBase64||!plan.simulation||plan.simulation.cost!==plan.estimatedFeeAndRentLamports)throw new Error('unsigned_preflight_required');
  const transaction=kit.getTransactionDecoder().decode(Buffer.from(plan.unsignedWireBase64,'base64'));
  const signatures={...transaction.signatures};
  for(const signer of signers){const [signed]=await signer.signTransactions([transaction]);Object.assign(signatures,signed);}
  for(const signature of Object.values(signatures))if(!signature||signature.every(b=>b===0))throw new Error('transaction_signature_missing');
  return kit.getBase64EncodedWireTransaction({...transaction,signatures});
}
