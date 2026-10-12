# Authentication email integration

AXP uses Supabase Auth for verified account identity and Resend SMTP for
transactional confirmation email. Email confirmation is part of the signup flow;
it does not create advertiser campaigns or authorize payments.

## Provider configuration

Use a dedicated, verified sending domain and a domain-restricted sending
credential. Configure that credential only in Supabase's encrypted SMTP settings,
not in browser code or source control. DNS records are supplied by the email
provider; existing website and receiving-email records remain independent.

Configure Supabase's Site URL and redirect allowlist for the exact account origin.
Loopback development and hosted HTTPS environments require their own permitted
callbacks. A local callback configuration does not configure a deployed release.

The confirmation template passes the native token hash to the account route:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm your AXP account</a>
```

## Application flow

1. Signup submits email/password to the backend's Supabase provider boundary.
2. Supabase sends the confirmation message through Resend SMTP.
3. The account page captures the confirmation hash and removes it from the URL.
4. An explicit confirmation action verifies the hash through the backend.
5. The backend establishes an opaque protected session for the verified identity.

The static UI proxy excludes callback credentials from its forwarded request.
Access/refresh tokens and confirmation credentials are not public account fields.

## Exercised behavior

Recorded acceptance on 12 October 2026 verified signup, delivered confirmation
email, confirmed sign-in and session persistence after refresh. Separate profile
acceptance covers advertiser/app creation, persistence and sign-out.
See [profile acceptance](END_TO_END_ACCEPTANCE.md).

Password recovery and exact hosted callback acceptance are release checks in the
[release checklist](FINAL_ROLLOUT_CHECKLIST.md). Saved SMTP settings alone are not
delivery evidence.

## References

- [Resend with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
