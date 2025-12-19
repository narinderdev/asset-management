export interface Asset {
  id?: number;
  assetId: string;
  assetName: string;
  category: string;
  type: string;
  location: string;
  lastServicedDate: string;
  warrantyExpiry: string;
  status: 'Active' | 'In Repair' | 'Retried';
}
