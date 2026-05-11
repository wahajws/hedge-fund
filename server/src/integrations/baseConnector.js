export class BaseConnector {
  constructor({ provider, apiKey }) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  hasCredentials() {
    return Boolean(this.apiKey);
  }

  freshness(sourceTimestamp) {
    if (!sourceTimestamp) return 'unknown';
    const ageMs = Date.now() - new Date(sourceTimestamp).getTime();
    if (ageMs < 5 * 60_000) return 'fresh';
    if (ageMs < 60 * 60_000) return 'delayed';
    return 'stale';
  }
}

