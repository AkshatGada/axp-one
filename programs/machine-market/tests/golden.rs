//! Cross-language checks against the JS owner's public Packet03 vectors.
//! Every decoded Rust field is compared with the JSON source, so swapping equal-
//! width fields cannot pass merely by round-tripping the same erroneous layout.
use axp_machine_market_program::{
    codec::{Bytes32, FixedAccount, Reader},
    domain,
    instruction::{Action, Instruction},
    state::*,
};
use serde_json::{json, Value};
use solana_program::pubkey::Pubkey;
use std::{path::PathBuf, str::FromStr};
const PACKET: &str = "d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c";
fn unhex(value: &str) -> Vec<u8> {
    assert_eq!(value.len() % 2, 0);
    (0..value.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&value[i..i + 2], 16).unwrap())
        .collect()
}
fn hex(value: &[u8]) -> String {
    value.iter().map(|byte| format!("{byte:02x}")).collect()
}
fn h(input: &Value, field: &str) -> Bytes32 {
    unhex(input[field].as_str().unwrap()).try_into().unwrap()
}
fn k(input: &Value, field: &str) -> Pubkey {
    Pubkey::from_str(input[field].as_str().unwrap()).unwrap()
}
fn n(input: &Value, field: &str) -> u64 {
    input[field].as_str().unwrap().parse().unwrap()
}
trait AsJson {
    fn as_json(&self) -> Value;
}
impl AsJson for Bytes32 {
    fn as_json(&self) -> Value {
        json!(hex(self))
    }
}
impl AsJson for Pubkey {
    fn as_json(&self) -> Value {
        json!(self.to_string())
    }
}
impl AsJson for u64 {
    fn as_json(&self) -> Value {
        json!(self.to_string())
    }
}
impl AsJson for u32 {
    fn as_json(&self) -> Value {
        json!(*self)
    }
}
impl AsJson for u16 {
    fn as_json(&self) -> Value {
        json!(*self)
    }
}
impl AsJson for u8 {
    fn as_json(&self) -> Value {
        json!(*self)
    }
}
macro_rules! fields{($row:expr,$input:expr; $($field:ident=>$name:literal),* $(,)?)=>{{let row=&$row;$(assert_eq!(row.$field.as_json(),$input[$name],"field {}",$name);)*}};}
macro_rules! account{($ty:ty,$bytes:expr,$input:expr; $($field:ident=>$name:literal),* $(,)?)=>{{
    let value=<$ty>::decode($bytes).unwrap();assert_eq!(value.encode().unwrap().as_slice(),($bytes).as_slice());
    fields!(value,$input;state=>"state",market=>"market",$($field=>$name),*);
}};}
fn instruction(bytes: &[u8], input: &Value) {
    let decoded = Instruction::decode(bytes).unwrap();
    assert_eq!(decoded.encode().unwrap(), bytes);
    assert_eq!(decoded.operation_id, h(input, "operationId"));
    match decoded.action {
        Action::Init(p) => {
            fields!(p,input;market_nonce=>"marketNonce",genesis=>"genesis",matcher=>"matcher",gateway=>"gateway",collector=>"collector",issuer=>"issuer",buyer_a=>"buyerA",buyer_b=>"buyerB",sponsor=>"sponsor")
        }
        Action::IssueSeries(p) => {
            fields!(p,input;series_id=>"seriesId",resource_hash=>"resourceHash",version_hash=>"versionHash",format=>"format",use_by_slot=>"useBySlot",sponsored_price=>"sponsoredPrice",cap=>"cap",max_transfers=>"maxTransfers",transferable=>"transferable",content_bytes=>"contentBytes")
        }
        Action::RegisterUnit { series_id, serial } => {
            assert_eq!(series_id.as_json(), input["seriesId"]);
            assert_eq!(serial.as_json(), input["serial"]);
        }
        Action::Fund(p) => {
            fields!(p,input;match_id=>"matchId",expected_cursor=>"expectedCursor",buy_nonce=>"buyNonce",sell_nonce=>"sellNonce",buy_auth_hash=>"buyAuthHash",sell_auth_hash=>"sellAuthHash",gross=>"gross",buyer_limit=>"buyerLimit",seller_limit=>"sellerLimit",buyer_valid_until=>"buyerValidUntil",seller_valid_until=>"sellerValidUntil",min_remaining_after=>"minRemainingAfter",funding_kind=>"fundingKind",expected_refund_face=>"expectedRefundFace",packet_hash=>"packetHash",campaign_id=>"campaignId")
        }
        Action::StartDelivery {
            expected_cursor,
            request_nonce,
            request_hash,
        } => {
            assert_eq!(expected_cursor.as_json(), input["expectedCursor"]);
            assert_eq!(request_nonce.as_json(), input["requestNonce"]);
            assert_eq!(request_hash.as_json(), input["requestHash"]);
        }
        Action::FinalizeDelivery {
            expected_locked_cursor,
            request_hash,
            response_hash,
        } => {
            assert_eq!(
                expected_locked_cursor.as_json(),
                input["expectedLockedCursor"]
            );
            assert_eq!(request_hash.as_json(), input["requestHash"]);
            assert_eq!(response_hash.as_json(), input["responseHash"]);
        }
        Action::RefundFailure {
            expected_locked_cursor,
            request_hash,
        }
        | Action::TimeoutRefund {
            expected_locked_cursor,
            request_hash,
        } => {
            assert_eq!(
                expected_locked_cursor.as_json(),
                input["expectedLockedCursor"]
            );
            assert_eq!(request_hash.as_json(), input["requestHash"]);
        }
        Action::ExpireUnused { expected_cursor } => {
            assert_eq!(expected_cursor.as_json(), input["expectedCursor"])
        }
    }
}
fn authorization(name: &str, bytes: &[u8], input: &Value) {
    let schema=match name{
        "BookOrder"=>(1,"orderId:h,side:1,lane:1,series:k,refundFace:8,exactUnit:k,expectedCursor:8,limit:8,validUntilSlot:8,minRemainingAfter:1,tif:1,quantity:1"),
        "Cancel"=>(2,"originalOrderId:h,originalNonce:h,originalAuthHash:h,expectedOrderVersion:8"),
        "SponsorMandate"=>(3,"campaignId:h,series:k,packetHash:h,budget:8,perGrant:8,maxGrants:2,eligibleCount:1,eligibleKeys:keys4,validUntilSlot:8,version:2"),
        "SponsoredConsent"=>(4,"orderId:h,campaignId:h,campaignVersion:2,series:k,unit:k,cursor:8,amount:8,sponsor:k,packetHash:h,validUntilSlot:8,assessment:1,nontransferable:1"),
        "DeliveryRequest"=>(5,"unit:k,expectedCursor:8,series:k,resourceHash:h"),
        "ReadDelivery"=>(6,"unit:k,requestHash:h,consumedCursor:8,validUntilSlot:8"),
        _=>panic!("unknown authorization vector"),
    };
    let mut reader = Reader::new(bytes);
    assert_eq!(&reader.bytes::<8>().unwrap(), b"AXPAUTH2");
    assert_eq!(reader.u8().unwrap(), schema.0);
    assert_eq!(reader.bytes::<32>().unwrap(), h(input, "domain"));
    assert_eq!(reader.key().unwrap(), k(input, "actor"));
    assert_eq!(reader.bytes::<32>().unwrap(), h(input, "nonce"));
    for field in schema.1.split(',') {
        let (name, ty) = field.split_once(':').unwrap();
        let value = match ty {
            "h" => reader.bytes::<32>().unwrap().as_json(),
            "k" => reader.key().unwrap().as_json(),
            "1" => reader.u8().unwrap().as_json(),
            "2" => reader.u16().unwrap().as_json(),
            "8" => reader.u64().unwrap().as_json(),
            "keys4" => Value::Array((0..4).map(|_| reader.key().unwrap().as_json()).collect()),
            _ => unreachable!(),
        };
        assert_eq!(value, input[name], "authorization field {name}");
    }
    reader.finish().unwrap();
    if name == "DeliveryRequest" {
        assert_eq!(
            domain::delivery_request(
                &h(input, "domain"),
                &k(input, "actor"),
                &h(input, "nonce"),
                &k(input, "unit"),
                n(input, "expectedCursor"),
                &k(input, "series"),
                &h(input, "resourceHash")
            ),
            bytes
        );
    }
}
#[test]
fn shared_packet03_golden_vectors_match_every_native_field() {
    let file = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../artifacts/machine-market/phase1/golden-vectors.json");
    let root: Value = serde_json::from_slice(
        &std::fs::read(file).expect("shared JS vectors must exist before acceptance"),
    )
    .unwrap();
    assert_eq!(root["schemaVersion"], "axp.market.golden.v1");
    assert_eq!(root["packetSha256"], PACKET);
    let vectors = root["vectors"].as_array().unwrap();
    assert_eq!(vectors.len(), 20);
    let mut counts = [0; 3];
    for vector in vectors {
        let input = &vector["input"];
        let bytes = unhex(vector["hex"].as_str().unwrap());
        let name = vector["name"].as_str().unwrap();
        match vector["family"].as_str().unwrap() {
            "instruction" => {
                instruction(&bytes, input);
                counts[0] += 1;
            }
            "authorization" => {
                authorization(name, &bytes, input);
                counts[1] += 1;
            }
            "account" => {
                counts[2] += 1;
                match name {
                    "Market" => {
                        account!(Market,&bytes,input;initializer=>"initializer",market_nonce=>"marketNonce",genesis=>"genesis",matcher=>"matcher",gateway=>"gateway",fee_collector=>"feeCollector",issuer=>"issuer",buyer_a=>"buyerA",buyer_b=>"buyerB",sponsor=>"sponsor",fee_bps=>"feeBps",max_transfers=>"maxTransfers",max_series=>"maxSeries",max_units=>"maxUnits",max_matches=>"maxMatches",issued_series=>"issuedSeries",issued_units=>"issuedUnits",funded_matches=>"fundedMatches",lease_slots=>"leaseSlots",max_gross=>"maxGross")
                    }
                    "Series" => {
                        account!(Series,&bytes,input;series_id=>"seriesId",issuer=>"issuer",resource_hash=>"resourceHash",version_hash=>"versionHash",terms_hash=>"termsHash",format=>"format",use_by_slot=>"useBySlot",sponsored_price=>"sponsoredPrice",cap=>"cap",issued=>"issued",max_transfers=>"maxTransfers",transferable=>"transferable",content_bytes=>"contentBytes")
                    }
                    "Unit" => {
                        account!(Unit,&bytes,input;series=>"series",unit_id=>"unitId",serial=>"serial",owner=>"owner",cursor=>"cursor",transfer_count=>"transferCount",sponsored=>"sponsored",primary_match=>"primaryMatch",latest_match=>"latestMatch",refund_face=>"refundFace",sponsor_refund_key=>"sponsorRefundKey",request_hash=>"requestHash",lock_start_cursor=>"lockStartCursor",lock_start_slot=>"lockStartSlot",lock_deadline_slot=>"lockDeadlineSlot",terminal_op_hash=>"terminalOpHash",response_hash=>"responseHash",terminal_slot=>"terminalSlot",terminal_reason=>"terminalReason")
                    }
                    "Match" => {
                        account!(Match,&bytes,input;match_id=>"matchId",unit=>"unit",series=>"series",expected_cursor=>"expectedCursor",funded_cursor=>"fundedCursor",payer=>"payer",beneficiary=>"beneficiary",seller=>"seller",buy_nonce=>"buyNonce",sell_nonce=>"sellNonce",buy_auth_hash=>"buyAuthHash",sell_auth_hash=>"sellAuthHash",gross=>"gross",fee=>"fee",trade_kind=>"tradeKind",packet_hash=>"packetHash",campaign_id=>"campaignId",fund_terms_hash=>"fundTermsHash",funded_slot=>"fundedSlot",terminal_op_hash=>"terminalOpHash",terminal_slot=>"terminalSlot",rent_reserve=>"rentReserve",primary_claim_face=>"primaryClaimFace",terminal_recipient=>"terminalRecipient",previous_match=>"previousMatch")
                    }
                    "OrderUse" => {
                        account!(OrderUse,&bytes,input;actor=>"actor",nonce=>"nonce",auth_hash=>"authHash",matched=>"match",consumed_slot=>"consumedSlot")
                    }
                    _ => panic!("unknown account vector"),
                }
            }
            _ => panic!("unknown vector family"),
        }
    }
    assert_eq!(counts, [9, 6, 5]);
}

#[test]
fn javascript_pda_vectors_match_solana_sdk_for_all_five_families() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../artifacts/machine-market/phase1/pda-vectors.json");
    let fixture: Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert_eq!(fixture["packetSha256"], PACKET);
    let vectors = fixture["vectors"].as_array().unwrap();
    assert_eq!(vectors.len(), 40);
    for vector in vectors {
        let seeds: Vec<Vec<u8>> = vector["seeds"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| unhex(v.as_str().unwrap()))
            .collect();
        let refs: Vec<&[u8]> = seeds.iter().map(Vec::as_slice).collect();
        let (address, bump) = Pubkey::find_program_address(&refs, &k(vector, "program"));
        assert_eq!(address.to_string(), vector["address"], "{}", vector["name"]);
        assert_eq!(
            u64::from(bump),
            vector["bump"].as_u64().unwrap(),
            "{}",
            vector["name"]
        );
    }
}
