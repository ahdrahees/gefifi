import { Router, Request, Response } from 'express';
import { FirestoreCollection } from '../data';
import { Project, User, WorkRequest, MaterialRequest, Chat } from '../interfaces';
import { authenticateToken, AuthenticatedRequest, JwtPayload } from '../auth';
import { sendSystemMessage } from './shared/system-messages';

// Initialize databases
const projectsDB = new FirestoreCollection<Project>('projects');
const usersDB = new FirestoreCollection<User>('users');
const workRequestsDB = new FirestoreCollection<WorkRequest>('workRequests');
const materialRequestsDB = new FirestoreCollection<MaterialRequest>('materialRequests');
const chatsDB = new FirestoreCollection<Chat>('chats');

const router = Router();

// --- Aggregated Projects Endpoint ---
router.get('/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user as JwtPayload;

        // 1. Fetch all projects where the user is involved.
        const allProjects = await projectsDB.getAll();
        const userProjects = allProjects.filter(
            (p) =>
                p.customerId === user.id ||
                p.workComponent?.expertId === user.id ||
                p.materialComponent?.supplierId === user.id
        );

        // 2. Tailor the response based on the user's role
        if (user.userType === 'expert') {
            const expertProjects = userProjects
                .filter((p) => p.workComponent?.expertId === user.id)
                .map((p) => ({ ...p, materialComponent: undefined })); // Strip material component
            return res.status(200).json(expertProjects);
        }

        if (user.userType === 'supplier') {
            const supplierProjects = userProjects
                .filter((p) => p.materialComponent?.supplierId === user.id)
                .map((p) => ({ ...p, workComponent: undefined })); // Strip work component
            return res.status(200).json(supplierProjects);
        }

        // For customers, return the full project objects
        res.status(200).json(userProjects);
    } catch (error: unknown) {
        console.error('Error fetching aggregated projects:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch projects.', error: errorMessage });
    }
});

router.get('/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const projectId = req.params.id;
        const project = await projectsDB.findById(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // Basic authorization: user must be part of the project
        const user = req.user as JwtPayload;
        if (
            user.id !== project.customerId &&
            user.id !== project.workComponent?.expertId &&
            user.id !== project.materialComponent?.supplierId
        ) {
            return res.status(403).json({ message: 'You are not authorized to view this project.' });
        }

        // Enrich project with full request details and user profiles
        const participantIds = new Set<string>([project.customerId]);
        if (project.workComponent) participantIds.add(project.workComponent.expertId);
        if (project.materialComponent) participantIds.add(project.materialComponent.supplierId);

        // Safely fetch requests - handle cases where request type doesn't match project component
        let workRequest = null;
        let materialRequest = null;

        try {
            if (project.workComponent) {
                workRequest = await workRequestsDB.findById(project.id);
            }
        } catch (error) {
            console.log(`Work request ${project.id} not found, skipping`);
        }

        try {
            if (project.materialComponent) {
                materialRequest = await materialRequestsDB.findById(project.id);
            }
        } catch (error) {
            console.log(`Material request ${project.id} not found, skipping`);
        }

        const [allChats, users] = await Promise.all([
            chatsDB.getAll(),
            usersDB.getByIds(Array.from(participantIds))
        ]);

        const usersMap = new Map(users.map((u) => [u.id, u]));

        project.workRequest = workRequest || undefined;
        project.materialRequest = materialRequest || undefined;
        project.customer = usersMap.get(project.customerId);
        if (project.workComponent) project.expert = usersMap.get(project.workComponent.expertId);
        if (project.materialComponent)
            project.supplier = usersMap.get(project.materialComponent.supplierId);

        // Find and attach chat IDs
        if (project.workComponent) {
            const workChat = allChats.find(
                (c) =>
                    c.participants.includes(project.customerId) &&
                    c.participants.includes(project.workComponent!.expertId)
            );
            if (workChat) project.workComponent.chatId = workChat.id;
        }
        if (project.materialComponent) {
            const materialChat = allChats.find(
                (c) =>
                    c.participants.includes(project.customerId) &&
                    c.participants.includes(project.materialComponent!.supplierId)
            );
            if (materialChat) project.materialComponent.chatId = materialChat.id;
        }

        res.status(200).json(project);
    } catch (error: unknown) {
        console.error(`Error fetching project ${req.params.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: 'Failed to fetch project.', error: errorMessage });
    }
});

router.put(
    '/projects/:projectId/status',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const user = req.user as JwtPayload;
            const projectId = req.params.projectId;
            const { component, newStatus } = req.body as {
                component: 'work' | 'material';
                newStatus: string;
            };

            if (!component || !newStatus) {
                return res.status(400).json({ message: 'Component and newStatus are required.' });
            }

            const project = await projectsDB.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Project not found.' });
            }

            // Authorization check can be more granular here
            if (
                user.id !== project.customerId &&
                user.id !== project.workComponent?.expertId &&
                user.id !== project.materialComponent?.supplierId
            ) {
                return res.status(403).json({ message: 'Only a party to the project can update status.' });
            }

            const now = new Date().toISOString();
            const historyEntry = { status: newStatus, updatedAt: now, updatedBy: user.id };

            const updatePayload: Partial<Project> = { updatedAt: now };

            if (component === 'work' && project.workComponent) {
                project.workComponent.status = newStatus as
                    | 'Not Started'
                    | 'In Progress'
                    | 'Awaiting Review'
                    | 'Completed'
                    | 'Disputed'
                    | 'Cancelled';
                project.workComponent.statusHistory.push(historyEntry);
                updatePayload.workComponent = project.workComponent;
            } else if (component === 'material' && project.materialComponent) {
                project.materialComponent.status = newStatus as
                    | 'Awaiting Dispatch'
                    | 'Dispatched'
                    | 'Delivered'
                    | 'Completed'
                    | 'Issue Reported'
                    | 'Cancelled';
                project.materialComponent.statusHistory.push(historyEntry);
                updatePayload.materialComponent = project.materialComponent;
            } else {
                return res.status(400).json({ message: 'Invalid component specified for this project.' });
            }

            const updatedProject = await projectsDB.update(projectId, updatePayload);

            // --- Chat Notification Logic ---
            if (updatedProject) {
                const recipientId =
                    component === 'work'
                        ? updatedProject.workComponent?.expertId
                        : updatedProject.materialComponent?.supplierId;
                if (recipientId) {
                    await sendSystemMessage(
                        updatedProject.customerId,
                        recipientId,
                        `The project's ${component} status was updated to: ${newStatus}.`
                    );
                }
            }

            res.status(200).json(updatedProject);
        } catch (error: unknown) {
            console.error('Error updating project status:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            res.status(500).json({ message: 'Failed to update project status.', error: errorMessage });
        }
    }
);

export default router;
