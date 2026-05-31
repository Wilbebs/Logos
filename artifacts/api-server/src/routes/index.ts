import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicantsRouter from "./applicants.js";
import chatRouter from "./chat.js";
import emailRouter from "./emailRoutes.js";
import acceptanceRouter from "./acceptance.js";
import webhookRouter from "./webhook.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/applicants", applicantsRouter);
router.use("/chat", chatRouter);
router.use("/email", emailRouter);
router.use("/applicants", acceptanceRouter);
router.use("/webhook", webhookRouter);

export default router;
