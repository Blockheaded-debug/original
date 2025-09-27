"use client"

import Header from "@/components/Analyze/Header";
import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../Button";
import Input from "../Input";

type SnapshotType = {
    status: string;
    current_price: number;
    tp: number;
    sl: number;
    indicators: Record<string, string>;
    support_zone: string;
    resistance_zone: string;
    breakout: {
        bullish: Record<string, string | null>;
        bearish: Record<string, string | null>;
    };
};

type ResultType = {
    chart_base64: string;
    signal: string;
    tp: number;
    sl: number;
    snapshot: SnapshotType;
};

export default function AnalayzePage() {
    const [pair, setPair] = useState("");

    const [result, setResult] = useState<ResultType>({
        chart_base64: "",
        signal: "",
        tp: 0,
        sl: 0,
        snapshot: {
            status: "",
            current_price: 0,
            tp: 0,
            sl: 0,
            indicators: {},
            support_zone: "",
            resistance_zone: "",
            breakout: {
                bullish: {},
                bearish: {},
            },
        },
    });

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        setResult({
            chart_base64: "",
            signal: "",
            tp: 0,
            sl: 0,
            snapshot: {
                status: "",
                current_price: 0,
                tp: 0,
                sl: 0,
                indicators: {},
                support_zone: "",
                resistance_zone: "",
                breakout: {
                    bullish: {},
                    bearish: {},
                },
            },
        });

        const apiPromise = new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/analyze`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ symbol: pair }),
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    return reject(result);
                }

                setResult(result);
                resolve(result);
            } catch (err: any) {
                reject(new Error("Gagal terhubung ke server"));
            }
        });

        toast.promise(apiPromise, {
            loading: "Mengirim permintaan...",
            success: "Signal berhasil digenerate!",
            error: (err: any) => err?.error || "Terjadi kesalahan",
        });
    };

    return (
        <div className="w-full flex flex-col flex-1 gap-5 pb-4">
            <Header />
            <form onSubmit={handleSubmit} className="px-6 flex flex-col gap-6">
                <h1 className="font-bold text-2xl text-[#F8F9FA]">Generate Signal</h1>
                <Input label="Pair" type="text" placeholder="ex. BTCUSDT" setValue={(e) => setPair(e.target.value)} />
                <Button type="submit" title={"Analyze"} />
            </form>
            {
                result.signal != "" && (
                    result.signal !== "NO SIGNAL" ? (
                        <div className="px-6 flex flex-col gap-4">
                            <img src={result.chart_base64} alt="" className="rounded-lg" />
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <div className="flex justify-between">
                                    <div>
                                        <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                            {pair.replace(/USDT$/, "/USDT")}
                                        </h2>
                                        <h3 className="text-[#9CA3AF] text-sm font-base">15 Minutes Timeframe</h3>
                                    </div>
                                    {result.signal === 'BUY' ? (
                                        <img src="/assets/images/long.png" alt="Long Position" className="h-fit" />
                                    ) : (result.signal === 'SELL') ? (
                                        <img src="/assets/images/short.png" alt="Short Position" className="h-fit" />
                                    ) : (
                                        <h2 className="text-[#F8F9FA] text-lg font-semibold">{result.signal}</h2>
                                    )}
                                </div>
                                <div className="pt-2 border-t-2 border-t-[#374151] flex flex-col gap-2">
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                        <p className="text-white text-2xl font-medium">${result.tp}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                        <p className="text-white text-2xl font-medium">${result.sl}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Support</p>
                                        <p className="text-white text-2xl font-medium">${result.snapshot.support_zone}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Resistance</p>
                                        <p className="text-white text-2xl font-medium">${result.snapshot.resistance_zone}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Signal Confidence</p>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                            <div className="bg-green-600 h-1.5 rounded-full dark:bg-green-500" style={{ width: result.snapshot.indicators.confidence?.split('%')[0] + '%' }}></div>
                                        </div>
                                        <p className="text-green-500 text-base font-semibold text-center">
                                            {result.snapshot.indicators.confidence?.split('%')[0] + '%'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <div className="flex justify-between">
                                    <div>
                                        <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                            Technical Indicators
                                        </h2>
                                    </div>
                                </div>
                                <div className="pt-2 border-t-2 border-t-[#374151] flex flex-col gap-2">
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">RSI (14)</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.rsi?.split(' ')[0]}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Stochastic</p>
                                        {(() => {
                                            const matches = result.snapshot.indicators.stochastic?.match(/[\d.]+/g);
                                            const k = matches?.[0] || '0';
                                            const d = matches?.[1] || '0';
                                            return (
                                                <p className="text-white text-2xl font-medium">
                                                    {k}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Keltner Channel</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.keltner?.split(' ')[0]}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Volume Met</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.keltner?.split(' ')[0] === "Not" ? 'Not Met' : 'Met'}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">EMA (100)</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.ema?.split(' ')[1]}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <h1 className="font-bold text-2xl text-[#F8F9FA]">15-Minute Breakout Scenarios</h1>
                                <div className="flex flex-col gap-5">
                                    <div className="flex gap-5">
                                        <div className="bg-green-600/25 border-[1px] border-green-600 rounded-full flex items-center justify-center px-2">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E" xmlns="http://www.w3.org/2000/svg">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M8.87867 5.63604C8.87867 5.08375 9.32639 4.63604 9.87867 4.63604H18.364C18.9162 4.63604 19.364 5.08375 19.364 5.63604V14.1213C19.364 14.6736 18.9162 15.1213 18.364 15.1213C17.8117 15.1213 17.364 14.6736 17.364 14.1213V8.05025L6.34314 19.0711C5.95261 19.4616 5.31945 19.4616 4.92893 19.0711C4.5384 18.6805 4.5384 18.0474 4.92893 17.6569L15.9497 6.63604H9.87867C9.32639 6.63604 8.87867 6.18832 8.87867 5.63604Z" fill="#22C55E" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                                Resistance Break
                                            </h2>
                                            <h3 className="text-[#9CA3AF] text-sm font-base">If price breakse above {result.snapshot.resistance_zone}</h3>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-t-[#374151] pt-5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Break Level</p>
                                            <p className="text-white text-base font-medium">{result.snapshot.resistance_zone}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                            <p className="text-green-500 text-base font-medium">{result.snapshot.breakout.bullish.tp}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                            <p className="text-red-500 text-base font-medium">{result.snapshot.breakout.bullish.sl}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-5 mt-10">
                                    <div className="flex gap-5">
                                        <div className="bg-green-600/25 border-[1px] border-green-600 rounded-full flex items-center justify-center px-2">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E" xmlns="http://www.w3.org/2000/svg">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M19.0711 4.92895C19.4616 5.31947 19.4616 5.95264 19.0711 6.34316L8.05026 17.364H14.1213C14.6736 17.364 15.1213 17.8117 15.1213 18.364C15.1213 18.9163 14.6736 19.364 14.1213 19.364H5.63605C5.08376 19.364 4.63605 18.9163 4.63605 18.364V9.87869C4.63605 9.32641 5.08376 8.87869 5.63605 8.87869C6.18833 8.87869 6.63605 9.32641 6.63605 9.87869V15.9498L17.6569 4.92895C18.0474 4.53842 18.6806 4.53842 19.0711 4.92895Z" fill="#22C55E" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                                Support Break
                                            </h2>
                                            <h3 className="text-[#9CA3AF] text-sm font-base">If price breakse below {result.snapshot.support_zone}</h3>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-t-[#374151] pt-5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Break Level</p>
                                            <p className="text-white text-base font-medium">{result.snapshot.support_zone}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                            <p className="text-green-500 text-base font-medium">{result.snapshot.breakout.bearish.tp}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                            <p className="text-red-500 text-base font-medium">{result.snapshot.breakout.bearish.sl}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* <div
                                    className="prose prose-invert max-w-none text-white"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(result.snapshot) }}
                                /> */}
                            </div>
                        </div>
                    ) : (
                        <div className="px-6 flex flex-col gap-4">
                            <img src={result.chart_base64} alt="" className="rounded-lg" />
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <div className="flex justify-between">
                                    <div>
                                        <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                            {pair.replace(/USDT$/, "/USDT")}
                                        </h2>
                                        <h3 className="text-[#9CA3AF] text-sm font-base">15 Minutes Timeframe</h3>
                                    </div>
                                    <h2 className="text-[#F8F9FA] text-lg font-semibold">{result.signal}</h2>
                                </div>
                                <div className="pt-2 border-t-2 border-t-[#374151] flex flex-col gap-2">
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                        <p className="text-white text-2xl font-medium">${result.tp}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                        <p className="text-white text-2xl font-medium">${result.sl}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Support</p>
                                        <p className="text-white text-2xl font-medium">${result.snapshot.support_zone}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Resistance</p>
                                        <p className="text-white text-2xl font-medium">${result.snapshot.resistance_zone}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Signal Confidence</p>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                                            <div className="bg-green-600 h-1.5 rounded-full dark:bg-green-500" style={{ width: result.snapshot.indicators.confidence?.split('%')[0] + '%' }}></div>
                                        </div>
                                        <p className="text-green-500 text-base font-semibold text-center">
                                            {result.snapshot.indicators.confidence?.split('%')[0] + '%'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <div className="flex justify-between">
                                    <div>
                                        <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                            Technical Indicators
                                        </h2>
                                    </div>
                                </div>
                                <div className="pt-2 border-t-2 border-t-[#374151] flex flex-col gap-2">
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">RSI (14)</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.rsi?.split(' ')[0]}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Stochastic</p>
                                        {(() => {
                                            const matches = result.snapshot.indicators.stochastic?.match(/[\d.]+/g);
                                            const k = matches?.[0] || '0';
                                            const d = matches?.[1] || '0';
                                            return (
                                                <p className="text-white text-2xl font-medium">
                                                    {k}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Keltner Channel</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.keltner?.split(' ')[0]}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">Volume Met</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.keltner?.split(' ')[0] === "Not" ? 'Not Met' : 'Met'}</p>
                                    </div>
                                    <div className="flex flex-col items-center bg-[#0B0E11] rounded-md p-5">
                                        <p className="text-[#9CA3AF] text-base font-semibold">EMA (100)</p>
                                        <p className="text-white text-2xl font-medium">{result.snapshot.indicators.ema?.split(' ')[1]}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg p-4 bg-[#1E2026] flex flex-col gap-4">
                                <h1 className="font-bold text-2xl text-[#F8F9FA]">15-Minute Breakout Scenarios</h1>
                                <div className="flex flex-col gap-5">
                                    <div className="flex gap-5">
                                        <div className="bg-green-600/25 border-[1px] border-green-600 rounded-full flex items-center justify-center px-2">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E" xmlns="http://www.w3.org/2000/svg">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M8.87867 5.63604C8.87867 5.08375 9.32639 4.63604 9.87867 4.63604H18.364C18.9162 4.63604 19.364 5.08375 19.364 5.63604V14.1213C19.364 14.6736 18.9162 15.1213 18.364 15.1213C17.8117 15.1213 17.364 14.6736 17.364 14.1213V8.05025L6.34314 19.0711C5.95261 19.4616 5.31945 19.4616 4.92893 19.0711C4.5384 18.6805 4.5384 18.0474 4.92893 17.6569L15.9497 6.63604H9.87867C9.32639 6.63604 8.87867 6.18832 8.87867 5.63604Z" fill="#22C55E" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                                Resistance Break
                                            </h2>
                                            <h3 className="text-[#9CA3AF] text-sm font-base">If price breakse above {result.snapshot.resistance_zone}</h3>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-t-[#374151] pt-5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Break Level</p>
                                            <p className="text-white text-base font-medium">{result.snapshot.resistance_zone}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                            <p className="text-green-500 text-base font-medium">{result.snapshot.breakout.bullish.tp}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                            <p className="text-red-500 text-base font-medium">{result.snapshot.breakout.bullish.sl}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-5 mt-10">
                                    <div className="flex gap-5">
                                        <div className="bg-green-600/25 border-[1px] border-green-600 rounded-full flex items-center justify-center px-2">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E" xmlns="http://www.w3.org/2000/svg">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M19.0711 4.92895C19.4616 5.31947 19.4616 5.95264 19.0711 6.34316L8.05026 17.364H14.1213C14.6736 17.364 15.1213 17.8117 15.1213 18.364C15.1213 18.9163 14.6736 19.364 14.1213 19.364H5.63605C5.08376 19.364 4.63605 18.9163 4.63605 18.364V9.87869C4.63605 9.32641 5.08376 8.87869 5.63605 8.87869C6.18833 8.87869 6.63605 9.32641 6.63605 9.87869V15.9498L17.6569 4.92895C18.0474 4.53842 18.6806 4.53842 19.0711 4.92895Z" fill="#22C55E" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-[#F8F9FA] text-lg font-semibold">
                                                Support Break
                                            </h2>
                                            <h3 className="text-[#9CA3AF] text-sm font-base">If price breakse below {result.snapshot.support_zone}</h3>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-t-[#374151] pt-5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Break Level</p>
                                            <p className="text-white text-base font-medium">{result.snapshot.support_zone}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Take Profit</p>
                                            <p className="text-green-500 text-base font-medium">{result.snapshot.breakout.bearish.tp}</p>
                                        </div>
                                        <div className="flex items-center justify-between bg-[#0B0E11] rounded-md p-5">
                                            <p className="text-[#9CA3AF] text-base font-semibold">Stop Loss</p>
                                            <p className="text-red-500 text-base font-medium">{result.snapshot.breakout.bearish.sl}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* <div
                                    className="prose prose-invert max-w-none text-white"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(result.snapshot) }}
                                /> */}
                            </div>
                        </div>
                    )
                )
            }
        </div>
    )
}