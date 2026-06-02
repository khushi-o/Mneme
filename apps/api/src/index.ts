import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { hallRouter } from "./modules/hall/hall.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { libraryRouter } from "./modules/library/library.routes.js";
import { readerRouter } from "./modules/reader/reader.routes.js";

const app = express();

app.use(
  cors({
    origin: config.webUrl,
    credentials: true,
  })
);
app.use(express.json());

app.use(healthRouter);
app.use("/v1/auth", authRouter);
app.use("/v1", libraryRouter);
app.use("/v1/reader", readerRouter);
app.use("/v1/halls", hallRouter);
app.use("/v1/ai", aiRouter);

app.use((_req, res) => {
  res.status(404).json({
    type: "about:blank",
    title: "Not found",
    status: 404,
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`mneme-api listening on http://localhost:${config.port}`);
  console.log(`  health  GET /health`);
  console.log(`  books   GET /v1/books`);
});
