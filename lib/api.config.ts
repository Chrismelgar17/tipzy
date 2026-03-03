import { getApiBaseUrl } from "./network";

const apiConfig = {
  get apiUrl(): string {
    return `${getApiBaseUrl()}/api`;
  },
  timeout: 10000, // 10 s — reduced from 15 s to prevent slow network hangs blocking startup
};

export default apiConfig;
