export { auth as middleware } from "@/auth";

export const config = {
    // Protect all routes except auth-related ones and assets
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
