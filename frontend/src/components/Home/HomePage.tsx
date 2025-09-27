"use client"

import { useRouter } from "next/navigation";
import Button from "../Button"
import Header from "./Header"


export default function HomePage() {
    const router = useRouter();

    return (
        <div className="w-full flex flex-col flex-1 gap-10">
            <Header />
            <Button type="button" title={"Get Started"} action={() => router.push('/auth/login')}/>
        </div>
    )
}