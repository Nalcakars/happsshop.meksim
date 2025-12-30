export type LoginResponse = {
  accessToken: string;
  accessTokenExpiresAt: string; // API DateTime -> string gelir
  refreshToken: string;
  refreshTokenExpiresAt: string;
  accountID: number;
  accountName: string;
  email: string;
};
