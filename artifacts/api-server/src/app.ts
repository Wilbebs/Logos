import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MachForm sends key-value pairs with Content-Type: text/plain
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.headers['content-type']?.startsWith('text/plain')) {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk; });
    req.on('end', () => {
      try {
        (req as any).body = Object.fromEntries(new URLSearchParams(data));
      } catch {
        (req as any).body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.use("/api", router);

export default app;
