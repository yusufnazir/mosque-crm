// Family API for dashboard stats
import { ApiClient } from './api';

export const familyApi = {
  getAll: () => ApiClient.get('/genealogy/families'),
  getFamilySizeDistribution: () => ApiClient.get('/genealogy/family-size-distribution'),
};
