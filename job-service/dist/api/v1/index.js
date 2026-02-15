"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const job_routes_js_1 = __importDefault(require("./routes/job.routes.js"));
const applications_routes_js_1 = __importDefault(require("./applications.routes.js"));
const interviews_routes_js_1 = __importDefault(require("./interviews.routes.js"));
const messages_routes_js_1 = __importDefault(require("./messages.routes.js"));
const recruiter_routes_js_1 = __importDefault(require("./routes/recruiter.routes.js"));
const router = express_1.default.Router();
// Mount routes
router.use('/jobs', job_routes_js_1.default);
router.use('/applications', applications_routes_js_1.default);
router.use('/interviews', interviews_routes_js_1.default);
router.use('/messages', messages_routes_js_1.default);
// Recruiter-specific routes (for /api/v1/recruiter/* from gateway)
router.use('/recruiter', recruiter_routes_js_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map