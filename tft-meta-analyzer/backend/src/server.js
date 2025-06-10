import express  from "express";
import cors     from "cors";
import dotenv   from "dotenv";
import mongoose from "mongoose";
import summonerRoute from "./routes/summoner.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error("DB connection error", e));

app.use("/summoner", summonerRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on port", PORT));
