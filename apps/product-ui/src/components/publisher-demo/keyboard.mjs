/** Tab is native focus navigation; only an unmodified, non-IME Enter submits. */
export function handleComposerKeyDown(event) {
  if (event.nativeEvent.isComposing || event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
