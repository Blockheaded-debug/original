"use client"

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const Header = () => {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut({
            redirect: false,
        });

        toast.success("Berhasil logout");
        router.push("/auth/login");
    };

    return (
        <div className="flex items-center justify-between bg-[#1E2026] py-4 px-3">
            <div className="flex items-center gap-2">
                <img src="/assets/images/logo2.png" alt="Logo Crypto Analyzer Pro" />
                <h1 className="font-semibold text-lg text-[#F8F9FA]">Crypto Analyzer Pro</h1>
            </div>
            <button onClick={handleLogout} className='w-fit text-center bg-red-600 border-[1px] border-red-600 px-5 py-1 rounded-lg font-semibold text-base text-[#F8F9FA] cursor-pointer hover:bg-[#F8F9FA] hover:text-red-600 transition-colors'>Logout</button>
        </div>
    )
}

export default Header