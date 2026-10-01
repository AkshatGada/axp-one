"use client";
// Checks computed in the viewer's browser, from the data on the page. Nothing is fetched.
import { useEffect, useState } from "react";
import { CheckMark } from "@axp/design-system/ledger";
import { canonical, hashCanonical, verifyEd25519 } from "@/lib/canonical.ts";

type State = "idle" | "pass" | "fail" | "skip";

export function LiveHash({ value, expected, label }: { value: unknown; expected: string; label: string }) {
  const [state, setState] = useState<State>("idle");
  useEffect(() => {
    let live = true;
    hashCanonical(value)
      .then((h) => live && setState(h === expected ? "pass" : "fail"))
      .catch(() => live && setState("fail"));
    return () => {
      live = false;
    };
  }, [value, expected]);
  const text = state === "pass" ? `${label} recomputed here: matches` : state === "fail" ? `${label} recomputed here: MISMATCH` : label;
  return <CheckMark state={state}>{text}</CheckMark>;
}

export function LiveSignature({ fields, signature, publicKeyPEM, label = "Publisher signature" }: { fields: unknown; signature: string; publicKeyPEM: string; label?: string }) {
  const [state, setState] = useState<State>("idle");
  useEffect(() => {
    let live = true;
    verifyEd25519(publicKeyPEM, signature, `AXP.delivery.v1\n${canonical(fields)}`).then((r) => {
      if (!live) return;
      setState(!r.supported ? "skip" : r.ok ? "pass" : "fail");
    });
    return () => {
      live = false;
    };
  }, [fields, signature, publicKeyPEM]);
  const text =
    state === "pass" ? `${label} verified here (Ed25519)` : state === "fail" ? `${label} INVALID` : state === "skip" ? "This browser cannot verify Ed25519; hash checks still ran" : label;
  return <CheckMark state={state}>{text}</CheckMark>;
}
