import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oroplayRouter from "./oroplay";
import authRouter from "./auth";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(oroplayRouter);

export default router;
