import { httpApiClient } from "@/shared/api/base/http-client";
import type { ApiClient } from "@/shared/api/model/contracts";

let apiClient: ApiClient = httpApiClient;

export const setApiClient = (client: ApiClient): void => {
  apiClient = client;
};

export const getApiClient = (): ApiClient => apiClient;
