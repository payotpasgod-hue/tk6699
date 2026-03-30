import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oroplayRouter from "./oroplay";
import authRouter from "./auth";
import adminRouter from "./admin";
import bonusRouter from "./bonus";
import depositRouter from "./deposit";
import withdrawRouter from "./withdraw";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(bonusRouter);
router.use(depositRouter);
router.use(withdrawRouter);
router.use(settingsRouter);
router.use(oroplayRouter);

export default router;
