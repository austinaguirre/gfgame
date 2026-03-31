import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/" },
});

export const config = {
  matcher: [
    "/home",
    "/home/:path*",
    "/admin",
    "/admin/:path*",
    "/profile",
    "/profile/:path*",
    "/game",
    "/game/:path*",
  ],
};
