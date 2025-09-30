import { FirestoreCollection } from '../../data';
import { MaterialRequest, Contract, WorkRequest } from '../../interfaces';

// Initialize databases
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');
const contractsDB = new FirestoreCollection<Contract>('contracts');

// Entity configuration for file limits
export const ENTITY_CONFIG = {
    'material-requests': { maxFiles: 10, collection: materialRequestsDB },
    contracts: { maxFiles: 15, collection: contractsDB },
    'work-requests': { maxFiles: 10, collection: workRequestsDB }
} as const;
