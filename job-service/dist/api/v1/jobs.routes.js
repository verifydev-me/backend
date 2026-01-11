"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const job_controller_js_1 = require("./controllers/job.controller.js");
const authenticate_js_1 = require("../../middlewares/authenticate.js");
const router = express_1.default.Router();
// All routes use the JobController which has proper error handling and service instantiation
router.post('/', authenticate_js_1.authenticate, job_controller_js_1.JobController.createJob);
router.get('/', job_controller_js_1.JobController.listJobs);
router.get('/search', job_controller_js_1.JobController.searchJobs);
router.get('/matched', authenticate_js_1.authenticate, job_controller_js_1.JobController.getMatchedJobs);
router.get('/:jobId', job_controller_js_1.JobController.getJob);
router.get('/:jobId/details', authenticate_js_1.authenticate, job_controller_js_1.JobController.getJobWithMatch);
router.post('/:jobId/apply', authenticate_js_1.authenticate, job_controller_js_1.JobController.applyToJob);
router.get('/:jobId/can-apply', authenticate_js_1.authenticate, job_controller_js_1.JobController.checkCanApply);
exports.default = router;
//# sourceMappingURL=jobs.routes.js.map