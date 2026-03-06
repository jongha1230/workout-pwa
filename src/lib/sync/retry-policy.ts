export const isRetryableHttpStatus = (status: number): boolean =>
  status === 429 || status >= 500;
