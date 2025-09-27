// app/analyze/layout.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function AnalyzeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.lastLoginAt) {
        redirect("/auth/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { lastLoginAt: true },
    });

    if (!user?.lastLoginAt) {
        redirect("/auth/login");
    }

    const tokenTime = new Date(session.user.lastLoginAt).getTime();
    const dbTime = new Date(user.lastLoginAt).getTime();

    if (tokenTime < dbTime) {
        redirect("/auth/login?reason=force-logout");
    }

    return <>{children}</>;
}
