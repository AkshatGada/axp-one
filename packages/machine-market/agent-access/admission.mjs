/** Bounded experiment admission gate; closing is synchronous and cannot be reopened. */
export function createAdmissionGate({remainingMs,useBySlot,minimumRemainingMs=300000,minimumSlotHeadroom=450}){
 let accepting=false,sealed=false,reason='checking-original-payment';
 const reject=code=>{throw Object.assign(Error(code),{code});};
 return Object.freeze({open(){if(sealed)return false;accepting=true;reason=null;return true;},close(why='operator-drain'){accepting=false;sealed=true;reason=why;},assert(slot){if(!accepting||sealed)reject('ADMISSIONS_CLOSED');if(remainingMs()<minimumRemainingMs){this.close('protected-drain-reserve');reject('ADMISSIONS_CLOSED');}if(BigInt(typeof useBySlot==='function'?useBySlot():useBySlot)-BigInt(slot)<BigInt(minimumSlotHeadroom)){this.close('series-deadline-headroom');reject('ADMISSIONS_CLOSED');}},snapshot(){return {accepting,sealed,reason,remainingMs:Math.max(0,remainingMs()),protectedDrainReserveMs:minimumRemainingMs,minimumSlotHeadroom};}});
}
