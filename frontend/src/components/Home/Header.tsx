
const Header = () => {
    return (
        <div className="flex flex-col items-center gap-4">
            <img src="/assets/images/logo.png" alt="Logo Crypto Analyzer Pro" />
            <div className="flex flex-col items-center">
                <h1 className="font-bold text-2xl text-[#F8F9FA]">Crypto Analyzer Pro</h1>
                <h2 className="font-normal text-sm text-[#9CA3AF]">Real-time trading signals</h2>
            </div>
        </div>
    )
}

export default Header