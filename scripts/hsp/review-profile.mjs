// Binds an operator-reviewed mapping to the actual captured live schemas/config.
// This command never contacts HSP or creates an order.
import {readFileSync,writeFileSync} from 'node:fs';
import {hash} from '../../packages/contracts/index.mjs';
import {schemaFingerprint,validateConfig,TOOLS,check} from '../../packages/hsp/config.mjs';
const capture=JSON.parse(readFileSync('local-state/hsk-hsp/discovery/schemas.json'));
const mapping=JSON.parse(readFileSync(process.argv[2]??'local-state/hsk-hsp/profile-input.json'));
check(mapping.reviewed===true,'hsp_explicit_schema_review_required');validateConfig(mapping.config);
for(const name of TOOLS.filter(n=>n!=='get_chain_config'))check(mapping.operations?.[name]?.input&&mapping.operations[name].output,'hsp_profile_mapping_missing');
const profile={...mapping,fingerprint:schemaFingerprint(capture.tools),chainConfigHash:hash(capture.configuration)};
writeFileSync('local-state/hsk-hsp/profile.json',JSON.stringify(profile,null,2),{mode:0o600});console.log('Reviewed profile saved privately. Live calls remain separately gated.');
