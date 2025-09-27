import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    console.log("✅ Middleware terpanggil:", req.nextUrl.pathname);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.id || !token.lastLoginAt) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const user = await prisma.user.findUnique({
        where: { id: token.id },
        select: { lastLoginAt: true },
    });

    if (!user) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (!user.lastLoginAt) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const tokenDate = new Date(token.lastLoginAt as string).getTime();
    const dbDate = new Date(user.lastLoginAt).getTime();

    console.log("token:", token.lastLoginAt);
    console.log("db:", user?.lastLoginAt?.toISOString());

    if (tokenDate < dbDate) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/analyze", "/analyze/", "/analyze/:path*"],
};
