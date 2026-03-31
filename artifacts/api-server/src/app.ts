import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requestLoggerMiddleware } from "./lib/request-logger";
import { trackVisitor, type VisitorTracker } from "./lib/visitor-tracker";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);
app.use(trackVisitor);

import * as path from "path";
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", router);

export { type VisitorTracker };
export default app;
