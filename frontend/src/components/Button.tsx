
type ButtonProps = {
    title: string;
    type: "submit" | "reset" | "button" | undefined;
    action?: () => void;
}

const Button = ({ title, action, type }: ButtonProps) => {
    return <button type={type} {...(action && { onClick: action })} className='w-full text-center bg-[#F0B90B] border-[1px] border-[#F0B90B] py-3 rounded-lg font-semibold text-base text-[#0B0E11] cursor-pointer hover:bg-[#0B0E11] hover:text-[#F0B90B] transition-colors'>{title}</button>
}

export default Button