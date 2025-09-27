
type InputProps = {
    type: "text" | "email" | "password";
    label?: string;
    placeholder?: string;
    value?: string;
    setValue?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({ type, label, placeholder, value, setValue }: InputProps) => {
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="font-medium text-sm text-[#F8F9FA]">{label}</label>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={setValue}
                className="w-full bg-[#1E2026] px-4 py-2 rounded-lg border-[1px] border-[#374151] text-[#F8F9FA] transition-colors focus:border-[#F0B90B] focus:outline-none focus-visible:outline-none"
            />
        </div>
    )
}

export default Input