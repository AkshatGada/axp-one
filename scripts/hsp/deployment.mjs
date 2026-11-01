import {mkdirSync,writeFileSync} from 'node:fs';
import {evmReaders,prepareRegistryDeployment,verifyRegistryDeployment} from '../../packages/hsp/evm.mjs';
import {address,check} from '../../packages/hsp/config.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...value]=arg.replace(/^--/,'').split('=');return [key,value.join('=')];}));check(address(args.registrar),'hsp_registrar_required');const {main}=await evmReaders({mainnetRpcURL:process.env.AXP_HSP_MAINNET_RPC_URL});
const result=args.transaction?await verifyRegistryDeployment({transactionHash:args.transaction,registrar:args.registrar,main}):await prepareRegistryDeployment({registrar:args.registrar,main,maxFeeWei:args['max-fee-wei']??'0'});
mkdirSync('local-state/hsk-hsp/contract',{recursive:true,mode:0o700});writeFileSync(`local-state/hsk-hsp/contract/${args.transaction?'deployment-verification':'unsigned-deployment'}.json`,JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({chainId:177,prepared:!args.transaction,verified:result.verified??false,broadcast:false}));
