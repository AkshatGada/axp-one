import {inheritProviderExecution} from '../product/provider-provenance.mjs';
import {check} from './config.mjs';
// Admissions, including uncertain attempts, retain their full conservative reserve.
export function budgetProvider({store,kind,provider,reservationMicroUsd}){
 check(['jev','answer'].includes(kind)&&/^\d+$/.test(reservationMicroUsd)&&BigInt(reservationMicroUsd)>=50000n,'hsp_provider_budget_invalid');
 const wrapper=async input=>{
  const rows=store.meta('provider-admissions')??[];check(!rows.some(r=>r.status==='unknown-usage'),'hsp_provider_reconciliation_required');const used=rows.reduce((n,r)=>n+BigInt(r.reservationMicroUsd),0n);
  check(rows.filter(r=>r.kind===kind).length<(kind==='jev'?24:6),'hsp_provider_attempt_cap');check(used+BigInt(reservationMicroUsd)<=1000000n,'hsp_provider_spend_cap');
  const row={id:rows.length,kind,reservationMicroUsd,status:'admitted'};rows.push(row);store.meta('provider-admissions',rows);
  try{const result=await provider(input);row.status='completed';rows[row.id]=row;store.meta('provider-admissions',rows);return result;}
  catch(e){row.status='unknown-usage';rows[row.id]=row;store.meta('provider-admissions',rows);throw e;}
 };
 return inheritProviderExecution(wrapper,provider);
}
