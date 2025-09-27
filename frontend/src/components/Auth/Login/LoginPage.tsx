"use client";

import Button from "@/components/Button";
import Header from "@/components/Home/Header";
import Input from "@/components/Input";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const reason = params.get("reason");
        if (reason === "force-logout") {
            toast.error("Kamu telah logout karena login dari device lain.");
        }
    }, [params]);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            toast.error("Email dan password wajib diisi");
            return;
        }

        const loginPromise = new Promise(async (resolve, reject) => {
            const result = await signIn("credentials", {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            console.log("Sign in result:", result);

            if (result?.ok) {
                resolve(result);
                router.push("/analyze");
            } else {
                reject(new Error("Email atau password salah"));
            }
        });

        toast.promise(loginPromise, {
            loading: "Sedang login...",
            success: "Berhasil login!",
            error: (err) => err.message,
        });
    };

    return (
        <div className="w-full flex flex-col flex-1 gap-10">
            <Header />
            <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                    <Input
                        label="Email"
                        type="email"
                        setValue={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                    />
                    <Input
                        label="Password"
                        type="password"
                        setValue={(e) =>
                            setFormData((prev) => ({ ...prev, password: e.target.value }))
                        }
                    />
                </div>
                <Button type="submit" title={"Login"} />
            </form>
        </div>
    );
}
