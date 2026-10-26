/** Review/template entry only. Live signer preparation and approval binding are absent. */
import {manifestTemplate} from '../../packages/machine-market/devnet/manifest.mjs';
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--manifest-template')process.stdout.write(JSON.stringify(manifestTemplate(),null,2)+'\n');
else if(args.length===0||args.length===1&&args[0]==='--help')process.stdout.write('Devnet driver: offline verification/review phase only.\n--manifest-template prints explicit pending public identities; creates no key/file.\nNo live --execute route exists. A subsequent ROOT phase must prepare scoped opaque\nhandles, validate the public manifest and bind action-time approval before signing.\n');
else{process.stderr.write('LIVE_KEY_PREPARATION_AND_ROOT_GO_REQUIRED\n');process.exitCode=2;}
