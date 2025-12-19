export interface ServiceRequest {
  requestId: string;
  requestDate: string;
  requester: string;
  shortTitle: string;
  maintenanceType: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'New' | 'Under Review' | 'In Progress' | 'Closed';
}
