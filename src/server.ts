import dotenv from "dotenv";
import app from "./index";

dotenv.config();

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});