export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    userName: string;
    role: string;
    businessId: string;
  };
}
