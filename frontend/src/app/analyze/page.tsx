import LoginPage from "@/components/Auth/Login/LoginPage";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import toast from "react-hot-toast";
import AnalayzePage from "@/components/Analyze/AnalyzePage";

export default async function Analyze() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    return (
        <main className="flex flex-1 justify-center min-h-screen h-full max-w-screen w-full">
            <AnalayzePage />
        </main>
    );
}
