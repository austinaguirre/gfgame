import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      admin: boolean;
      is_active: boolean;
    };
  }

  interface User {
    id: string;
    username: string;
    admin: boolean;
    is_active: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    admin: boolean;
    is_active: boolean;
    /** Last time admin/is_active were synced from DB (ms). Refreshed at most every 7 days. */
    profileSyncedAt?: number;
  }
}
