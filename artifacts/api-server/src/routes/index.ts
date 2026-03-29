import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oroplayRouter from "./oroplay";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oroplayRouter);

export default router;
