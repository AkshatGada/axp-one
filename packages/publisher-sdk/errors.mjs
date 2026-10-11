// Browser-safe error identity shared by transport and response validation.
export class PublisherSDKError extends Error {
  constructor(code, {status, cause} = {}) {
    super(code, {cause}); this.name = 'PublisherSDKError'; this.code = code;
    if (status !== undefined) this.status = status;
  }
}
