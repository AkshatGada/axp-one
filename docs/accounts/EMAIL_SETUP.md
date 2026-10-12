# AXP authentication email setup — 12 October 2026

## Saved configuration

User authorized the dedicated `auth.axp.one` sender, required additive GoDaddy
DNS records, private sending credential and Supabase authentication-email setup.

- Resend domain: `auth.axp.one`, Tokyo (`ap-northeast-1`).
- Three provider-issued DNS records added: TXT `resend._domainkey.auth`,
  CNAME `rsend.auth` → `rsend-apne1.forge.rmta.net`, and CNAME `send.auth` →
  `send.forge.rmta.net`. The DKIM public value is available in provider/DNS UI.
- All seven pre-existing zone records were retained, including root website A,
  www CNAME, nameservers and DMARC. No receiving mailbox/MX or website change.
- Resend key named `AXP Supabase Auth`: **Sending access**, restricted to
  **auth.axp.one**. Its secret was transferred directly to Supabase's encrypted
  SMTP password setting; no secret backup or source-control copy was created.
- Dedicated Supabase project: `qcejmyhaakoedjaqmcub`.
- SMTP enabled: `smtp.resend.com`, port `465`, username `resend`.
- Sender: `AXP <noreply@auth.axp.one>`; per-user minimum interval `60` seconds.
  Provider UI reports custom-SMTP default limit of 30 emails/hour; not raised.
- Site URL and sole allowed redirect: `http://127.0.0.1:3495/account/`.
  This is local-only configuration, not a deployed production account route.
- Confirmation subject: `Confirm your AXP account`.
- Body contains one AXP-native confirmation link:

  ```html
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm your AXP account</a>
  ```

Email confirmation remains required. The app handles the native token hash only
after the person explicitly clicks Confirm email. It does not import provider
access/refresh tokens from a default fragment callback.

## Verification and remaining gate

- GoDaddy save succeeded with ten total DNS records. Both authoritative
  nameservers and Cloudflare's public resolver return the sending CNAME.
- Resend displayed a Domain verified event and verified DKIM/return-path records,
  but its overall status later became partially verified with `send.auth`
  pending. One Restart verification was requested after authoritative DNS
  propagation. Do not describe the provider as fully verified until its latest
  status and a real delivery establish that.
- Supabase confirmed SMTP settings saved; re-navigation showed SMTP enabled,
  the correct host/port and a stored, hidden password.
- Supabase confirmed the exact redirect and corrected template were saved.
  Preview shows a single confirmation link with RedirectTo/TokenHash/type=email.
- No tracking subdomain was created. Tracking configuration remains unconfigured;
  delivered-link rewriting was not independently inspected.
- Local health reports configured Supabase, origin and private store.

**Actual acceptance, 12 October:** human signup is present in Supabase, the
`Confirm your AXP account` email is marked delivered in Resend, and the human's
browser showed email confirmed and signed in. Refresh account retained the
provider-verified session. Signup was 15:59:49 IST; the user record showed last
sign-in at 16:00:06 IST. The earlier authentication error was a sign-in attempt
before that user existed, not evidence that SMTP delivery failed.

**Open:** create advertiser/AI-app profiles, reload and human-operated sign-out.
These checks have not been performed on the human's behalf. Never share passwords,
confirmation links/hashes, session cookies or provider tokens in logs or reports.

The saved settings alone are not delivery evidence; the actual delivered email
and verified session above establish the exercised authentication flow. Password
recovery, tenant campaign serving and app-scoped SDK credentials remain separate
work. No deployment, payment, model call or main/specialist checkout modification.

## References

- [Resend with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
