import { getApiBaseUrl } from "./network";

const apiConfig = {
  get apiUrl(): string {
    return `${getApiBaseUrl()}/api`;
  },
  timeout: 15000,
};

export default apiConfig;
