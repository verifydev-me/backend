"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const application_service_js_1 = require("../../domain/application.service.js");
const authenticate_js_1 = require("../../middlewares/authenticate.js");
const applicationService = new application_service_js_1.ApplicationService();
const router = express_1.default.Router();
// Protect all application routes
router.use(authenticate_js_1.authenticate);
// Apply to a job
router.post('/', async (req, res, next) => {
    try {
        const application = await applicationService.apply(req.user.userId, req.body.jobId, req.body);
        res.status(201).json({ success: true, data: application });
    }
    catch (error) {
        next(error);
    }
});
// Get user's applications
router.get('/my-applications', async (req, res, next) => {
    try {
        const { status } = req.query;
        const applications = await applicationService.getUserApplications(req.user.userId, status);
        res.json({ success: true, data: applications });
    }
    catch (error) {
        next(error);
    }
});
// Get single application
router.get('/:id', async (req, res, next) => {
    try {
        const application = await applicationService.getApplicationById(req.params.id);
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }
        // Check authorization
        if (application.userId !== req.user.userId && application.job?.recruiterId !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        res.json({ success: true, data: application });
    }
    catch (error) {
        next(error);
    }
});
// Withdraw application
router.post('/:id/withdraw', async (req, res, next) => {
    try {
        const result = await applicationService.withdraw(req.params.id, req.user.userId);
        res.json({ success: true, data: { withdrawn: result } });
    }
    catch (error) {
        next(error);
    }
});
// Get applications for a job (recruiter only)
router.get('/job/:jobId', async (req, res, next) => {
    try {
        const { status } = req.query;
        const applications = await applicationService.getJobApplications(req.params.jobId, status);
        res.json({ success: true, data: applications });
    }
    catch (error) {
        next(error);
    }
});
// Update application status (recruiter only)
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const application = await applicationService.updateStatus(req.params.id, status, notes);
        res.json({ success: true, data: application });
    }
    catch (error) {
        next(error);
    }
});
// Add recruiter notes (recruiter only)
router.post('/:id/notes', async (req, res, next) => {
    try {
        const { notes } = req.body;
        const application = await applicationService.addNote(req.params.id, notes);
        res.json({ success: true, data: application });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=applications.routes.js.map