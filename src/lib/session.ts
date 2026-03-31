import { getServerSession } from "next-auth";
import { authOptions } from "./auth-config";

export async function getSession() {
  return getServerSession(authOptions);
}
