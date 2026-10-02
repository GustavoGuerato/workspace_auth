import { createRefreshToken } from "../services/refresh-token.service";
describe("Refresh Token Service", () => {
  it("deve criar um refresh token", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";

    const refreshToken = await createRefreshToken(userId);

    console.log(refreshToken);
  });
});
