
import axiosBase from 'axios';
import axiosRetry from 'axios-retry';

const axios = axiosBase.create();

// this will be useful to retry some requests, exponential delay
const retryDelay = (retryNumber = 0) => {
  const seconds = Math.pow(2, retryNumber) * 1000;
  const randomMs = 1000 * Math.random();
  return seconds + randomMs;
};
  
// configure retry policy, default we don't retry, just to be safe and not send the sms twice
axiosRetry(axios, {
  retries: 0,
  retryDelay,
});

const httpClient = axios;
const isRetryableError = axiosRetry.isRetryableError;

export { httpClient, isRetryableError }