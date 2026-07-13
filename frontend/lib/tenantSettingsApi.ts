import { ApiClient } from './api';

export const tenantSettingsApi = {
  getPublicDirectoryAccess: () =>
    ApiClient.get<{ enabled: boolean }>('/tenant-settings/public-directory-enabled'),
};
