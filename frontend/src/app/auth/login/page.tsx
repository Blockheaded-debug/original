import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LoginPage from "@/components/Auth/Login/LoginPage";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Login() {
    return (
        <main className="px-6 flex flex-1 justify-center items-center min-h-screen h-full max-w-screen w-full">
            <LoginPage />
        </main>
    );
}
