'use client';
import {useAccountPresence} from '@/components/shared/mode';

/** Header link to the private account, worded for whether the visitor is signed in. */
export function GuideAccountLink() {
  const presence = useAccountPresence();
  return <a href="/account/">{presence.state === 'signed-in' ? 'Your account →' : 'Sign in →'}</a>;
}
