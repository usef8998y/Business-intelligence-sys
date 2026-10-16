"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const health_routes_1 = require("./routes/health.routes");
const ontology_routes_1 = require("./routes/ontology.routes");
const swagger_1 = require("./config/swagger");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
app.use('/api', health_routes_1.healthRouter);
app.use('/api', ontology_routes_1.ontologyRouter);
const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => {
    console.log(`Retail BI backend listening on port ${PORT}`);
});
async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
        await (0, database_1.closePool)();
        process.exit(0);
    });
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
exports.default = app;
//# sourceMappingURL=index.js.map