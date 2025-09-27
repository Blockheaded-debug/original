import os
import time
import logging
import requests
import pandas as pd
import numpy as np
import ta
from prophet import Prophet
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import base64
from flask import Flask, request, jsonify
from typing import Optional, Tuple, Dict, Any
import configparser
from flask_cors import CORS

# === Configuration Setup ===
CONFIG_FILE = os.getenv("CONFIG_FILE", "config.ini")
config = configparser.ConfigParser()
config['DEFAULT'] = {
    'ChartsDir': './charts',
    'LogLevel': 'INFO',
    'BinanceApiUrl': 'https://api.binance.com/api/v3',
    'RequestTimeout': '10',
    'CandleLimit': '500',
    'CandleInterval': '15m'
}

if os.path.exists(CONFIG_FILE):
    config.read(CONFIG_FILE)

CHARTS_DIR = config['DEFAULT']['ChartsDir']
LOG_LEVEL = config['DEFAULT']['LogLevel']
BINANCE_API_URL = config['DEFAULT']['BinanceApiUrl']
REQUEST_TIMEOUT = int(config['DEFAULT']['RequestTimeout'])
CANDLE_LIMIT = int(config['DEFAULT']['CandleLimit'])
CANDLE_INTERVAL = config['DEFAULT']['CandleInterval']

# === Configure Logging ===
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crypto_analyzer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# === Ensure Charts Directory Exists ===
os.makedirs(CHARTS_DIR, exist_ok=True)

# === Fetch 500 Candles from Binance ===
def fetch_candles(symbol: str, interval: str = CANDLE_INTERVAL, limit: int = CANDLE_LIMIT) -> Optional[pd.DataFrame]:
    logger.info(f"Fetching {limit} candles for {symbol} ({interval})")
    url = f"{BINANCE_API_URL}/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    try:
        res = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        res.raise_for_status()
        data = res.json()
        df = pd.DataFrame(data, columns=[
            "timestamp", "open", "high", "low", "close", "volume",
            "close_time", "qav", "trades", "tbbav", "tbqav", "ignore"
        ])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        df[["open", "high", "low", "close", "volume"]] = df[["open", "high", "low", "close", "volume"]].astype(float)
        logger.info(f"Successfully fetched {len(df)} candles for {symbol}")
        return df
    except Exception as e:
        logger.error(f"Failed to fetch candles for {symbol}: {str(e)}")
        return None

# === Fetch Current Price from Binance ===
def fetch_current_price(symbol: str) -> Optional[float]:
    logger.info(f"Fetching current price for {symbol}")
    url = f"{BINANCE_API_URL}/ticker/price"
    params = {"symbol": symbol.upper()}
    try:
        res = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        res.raise_for_status()
        data = res.json()
        price = float(data["price"])
        logger.info(f"Successfully fetched current price: {price}")
        return price
    except Exception as e:
        logger.error(f"Failed to fetch current price for {symbol}: {str(e)}")
        return None

# === Generate Chart Snapshot ===
def generate_chart_snapshot(df: pd.DataFrame, symbol: str, save_path: str) -> bool:
    logger.info(f"Generating chart snapshot for {symbol}")
    try:
        plt.style.use('dark_background')
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 12), gridspec_kw={'height_ratios': [3, 1]})
        current_price = df['close'].iloc[-1]
        open_price = df['open'].iloc[0]
        high_price = df['high'].max()
        low_price = df['low'].min()
        volume_24h = df['volume'].sum()
        price_change = current_price - open_price
        price_change_pct = (price_change / open_price) * 100
        color = '#00FF88' if price_change >= 0 else '#FF4444'
        for i in range(len(df)):
            row = df.iloc[i]
            body_color = '#00FF88' if row['close'] >= row['open'] else '#FF4444'
            body_height = abs(row['close'] - row['open'])
            body_bottom = min(row['open'], row['close'])
            ax1.plot([row['timestamp'], row['timestamp']], [row['low'], row['high']],
                     color='#666666', linewidth=1, alpha=0.8)
            ax1.add_patch(plt.Rectangle((mdates.date2num(row['timestamp']) - 0.3, body_bottom),
                                        0.6, body_height, facecolor=body_color, alpha=0.8))
        df['MA20'] = df['close'].rolling(window=20).mean()
        df['MA50'] = df['close'].rolling(window=50).mean()
        ax1.plot(df['timestamp'], df['MA20'], color='#FFD700', linewidth=2, alpha=0.8, label='MA20')
        ax1.plot(df['timestamp'], df['MA50'], color='#00BFFF', linewidth=2, alpha=0.8, label='MA50')
        ax1.set_title(f'{symbol} - 15 Minute Chart | ${current_price:,.2f} ({price_change_pct:+.2f}%)',
                      fontsize=20, fontweight='bold', color=color, pad=20)
        ax1.set_ylabel('Price (USD)', fontsize=14, color='white')
        ax1.grid(True, alpha=0.3)
        ax1.legend(loc='upper left', fancybox=True, shadow=True)
        ax1.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        ax1.xaxis.set_major_locator(mdates.HourLocator(interval=4))
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)
        volume_colors = ['#00FF88' if df.iloc[i]['close'] >= df.iloc[i]['open'] else '#FF4444'
                         for i in range(len(df))]
        ax2.bar(df['timestamp'], df['volume'], color=volume_colors, alpha=0.6, width=0.8)
        ax2.set_ylabel('Volume', fontsize=14, color='white')
        ax2.set_xlabel('Time', fontsize=14, color='white')
        ax2.grid(True, alpha=0.3)
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        ax2.xaxis.set_major_locator(mdates.HourLocator(interval=4))
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45)
        stats_text = f"""
        📊 MARKET STATS
        Current: ${current_price:,.2f}
        24h Change: {price_change_pct:+.2f}%
        24h High: ${high_price:,.2f}
        24h Low: ${low_price:,.2f}
        Volume: {volume_24h:,.0f}
        """
        ax1.text(0.02, 0.98, stats_text, transform=ax1.transAxes,
                 verticalalignment='top', bbox=dict(boxstyle='round',
                 facecolor='black', alpha=0.8), fontsize=12, color='white')
        timestamp_text = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"
        ax2.text(0.02, 0.02, timestamp_text, transform=ax2.transAxes,
                 fontsize=10, color='#888888')
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight',
                    facecolor='black', edgecolor='none')
        plt.close()
        logger.info(f"Chart snapshot saved to {save_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to generate chart snapshot: {str(e)}")
        return False

# === Forecast Future Prices with Prophet ===
def forecast_prices(df: pd.DataFrame, periods: int = 30, interval: str = '15m') -> Optional[pd.DataFrame]:
    logger.info(f"Forecasting {periods} future candles for {df.name}")
    try:
        prophet_df = df[['timestamp', 'close']].rename(columns={'timestamp': 'ds', 'close': 'y'})
        model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        model.fit(prophet_df)
        future = model.make_future_dataframe(periods=periods, freq='15min')
        forecast = model.predict(future)
        future_forecast = forecast.tail(periods)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        logger.info(f"Successfully forecasted {periods} candles for {df.name}")
        return future_forecast
    except Exception as e:
        logger.error(f"Failed to forecast prices for {df.name}: {str(e)}")
        return None

# === Calculate RSI (14-period) ===
def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    rsi = ta.momentum.RSIIndicator(df['close'], window=period).rsi()
    df['rsi'] = rsi
    return rsi

# === Calculate Stochastic (14, 3) ===
def calculate_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Tuple[pd.Series, pd.Series]:
    stoch = ta.momentum.StochasticOscillator(df['high'], df['low'], df['close'], window=k_period, smooth_window=d_period)
    df['stoch_k'] = stoch.stoch()
    df['stoch_d'] = stoch.stoch_signal()
    return df['stoch_k'], df['stoch_d']

# === Calculate EMA (100, 200) on 1-hour timeframe ===
def calculate_ema(df: pd.DataFrame, periods: list = [100, 200], interval: str = '1h') -> Optional[Dict[str, float]]:
    if interval == '1h':
        df_1h = fetch_candles(df.name, interval='1h', limit=200)
        if df_1h is None:
            logger.error("Failed to fetch 1h data for EMA calculation")
            return None
        df = df_1h
    emas = {}
    for period in periods:
        ema = df['close'].ewm(span=period, adjust=False).mean()
        emas[f'ema{period}'] = ema.iloc[-1]
    df['ema100'] = emas['ema100']
    df['ema200'] = emas['ema200']
    return emas

# === Calculate Keltner Channels ===
def calculate_keltner_channels(df: pd.DataFrame, length: int = 20, multiplier: float = 1.5) -> Tuple[float, float, float]:
    basis = df['close'].ewm(span=length, adjust=False).mean()
    true_range = ta.volatility.AverageTrueRange(df['high'], df['low'], df['close'], window=1).average_true_range()
    upper = basis + true_range.rolling(window=length, min_periods=1).mean() * multiplier
    lower = basis - true_range.rolling(window=length, min_periods=1).mean() * multiplier
    return upper.iloc[-1], basis.iloc[-1], lower.iloc[-1]

# === Advanced Support & Resistance Detection ===
def detect_support_resistance_zones(df: pd.DataFrame) -> Tuple[Tuple[float, float], Tuple[float, float]]:
    support_zones = []
    resistance_zones = []
    prices = df['close'].values
    for i in range(len(prices) - 1):
        current_price = prices[i]
        for j in range(i + 1, len(prices)):
            next_price = prices[j]
            price_diff = abs(next_price - current_price)
            percent_diff = (price_diff / current_price) * 100
            if 1 <= percent_diff <= 3:
                bounce_count = 1
                for k in range(j + 1, len(prices)):
                    check_price = prices[k]
                    check_diff = abs(check_price - current_price)
                    check_percent = (check_diff / current_price) * 100
                    if 1 <= check_percent <= 3:
                        bounce_count += 1
                        if bounce_count >= 2:
                            if next_price < current_price and check_price < current_price:
                                zone_min = min(current_price, next_price, check_price) * 0.99
                                zone_max = max(current_price, next_price, check_price) * 1.01
                                support_zones.append((zone_min, zone_max))
                            elif next_price > current_price and check_price > current_price:
                                zone_min = min(current_price, next_price, check_price) * 0.99
                                zone_max = max(current_price, next_price, check_price) * 1.01
                                resistance_zones.append((zone_min, zone_max))
                            break
                if bounce_count >= 2:
                    break
    if support_zones:
        support_zone = sorted(support_zones, key=lambda x: x[0], reverse=True)[0]
    else:
        support_zone = (df['low'].min() * 0.99, df['low'].min() * 1.01)
    if resistance_zones:
        resistance_zone = sorted(resistance_zones, key=lambda x: x[1])[0]
    else:
        resistance_zone = (df['high'].max() * 0.99, df['high'].max() * 1.01)
    current_price = df['close'].iloc[-1]
    if support_zone[0] >= resistance_zone[1]:
        logger.warning(f"Invalid zones: Support {support_zone}, Resistance {resistance_zone}. Using defaults...")
        support_zone = (df['low'].min() * 0.99, df['low'].min() * 1.01)
        resistance_zone = (df['high'].max() * 0.99, df['high'].max() * 1.01)
    elif support_zone[0] > current_price or resistance_zone[1] < current_price:
        logger.warning(f"Zones misaligned: Support {support_zone}, Resistance {resistance_zone}. Swapping...")
        support_zone, resistance_zone = resistance_zone, support_zone
    logger.debug(f"Support Zone: {support_zone}, Resistance Zone: {resistance_zone}")
    return support_zone, resistance_zone

# === Rounding Logic ===
def format_strategy_number(value: float) -> float:
    if value > 100:
        return round(value)
    return round(value, 2)

# === Format Price/TP/SL ===
def format_price(value: Any, reference_price: float) -> str:
    if isinstance(value, str):
        return value
    if value > 1 or reference_price > 1:
        return f"{value:.2f}"
    return f"{value:.8f}".rstrip('0').rstrip('.')

# === Escape Markdown Special Characters ===
def escape_markdown(text: str) -> str:
    special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    for char in special_chars:
        text = text.replace(char, f'\\{char}')
    return text

# === Strategy Logic with Scoring ===
def run_strategy(df: pd.DataFrame) -> Tuple[Dict[str, Any], bool]:
    if df is None or len(df) < CANDLE_LIMIT:
        return {"signal": "NO SIGNAL", "tp": 0, "sl": 0, "chart_base64": "", "snapshot": "Error: Failed to fetch candle data"}, False
    logger.info("Running strategy indicators...")
    rsi = calculate_rsi(df)
    stoch_k, stoch_d = calculate_stochastic(df)
    emas = calculate_ema(df, interval='1h')
    if emas is None or emas['ema100'] == 0 or emas['ema200'] == 0:
        return {"signal": "NO SIGNAL", "tp": 0, "sl": 0, "chart_base64": "", "snapshot": "Error: Invalid EMA data"}, False
    upper_kc, basis_kc, lower_kc = calculate_keltner_channels(df)
    if upper_kc == 0 or lower_kc == 0:
        return {"signal": "NO SIGNAL", "tp": 0, "sl": 0, "chart_base64": "", "snapshot": "Error: Invalid Keltner data"}, False
    support_zone, resistance_zone = detect_support_resistance_zones(df)
    current_price = fetch_current_price(df.name) or df['close'].iloc[-1]
    vol = df['volume'].iloc[-1] * df['close'].iloc[-1]
    avg_vol = (df['volume'] * df['close']).rolling(window=20, min_periods=1).mean().iloc[-1]
    volume_threshold = avg_vol * 1.5
    rsi_crossover = rsi.iloc[-1] > 50 and rsi.iloc[-2] <= 50
    rsi_crossunder = rsi.iloc[-1] < 50 and rsi.iloc[-2] >= 50
    stoch_crossover = stoch_k.iloc[-1] > 20 and stoch_k.iloc[-2] <= 20
    stoch_crossunder = stoch_k.iloc[-1] < 80 and stoch_k.iloc[-2] >= 80
    bullish_rsi = rsi_crossover or rsi.iloc[-1] > 56
    bearish_rsi = rsi_crossunder or rsi.iloc[-1] < 46
    bullish_stoch = stoch_k.iloc[-1] > 20 and (stoch_crossover or stoch_k.iloc[-1] > 50)
    bearish_stoch = stoch_k.iloc[-1] < 80 and (stoch_crossunder or stoch_k.iloc[-1] < 50)
    bullish_price = current_price > upper_kc
    bearish_price = current_price < lower_kc
    bullish_volume = vol > volume_threshold
    bearish_volume = vol > volume_threshold
    bullish_ema = emas['ema100'] > emas['ema200'] + 1e-8
    bearish_ema = emas['ema100'] < emas['ema200'] - 1e-8
    not_overbought = rsi.iloc[-1] < 70 and stoch_k.iloc[-1] < 80
    not_oversold = rsi.iloc[-1] > 30 and stoch_k.iloc[-1] > 20
    bullish_points = sum([bullish_rsi, bullish_stoch, bullish_price, bullish_volume, bullish_ema])
    bearish_points = sum([bearish_rsi, bearish_stoch, bearish_price, bearish_volume, bearish_ema])
    confidence = max(bullish_points, bearish_points) / 5 * 100
    signal_type = "NO SIGNAL"
    sl = tp = None
    if bullish_price and bullish_volume and bullish_ema:
        signal_type = "BUY"
        confidence = max(75, confidence)
        sl = min(support_zone[0], current_price * 0.98)
        tp = max(resistance_zone[1], current_price * 1.02)
    elif bearish_price and bearish_volume and bearish_ema:
        signal_type = "SELL"
        confidence = max(75, confidence)
        sl = max(resistance_zone[1], current_price * 1.02)
        tp = min(support_zone[0], current_price * 0.98)
    elif bullish_points >= 3 and not_overbought:
        signal_type = "BUY"
        sl = min(support_zone[0], current_price * 0.98)
        tp = max(resistance_zone[1], current_price * 1.02)
    elif bearish_points >= 3 and not_oversold:
        signal_type = "SELL"
        sl = max(resistance_zone[1], current_price * 1.02)
        tp = min(support_zone[0], current_price * 0.98)
    if signal_type != "NO SIGNAL":
        forecast = forecast_prices(df, periods=30)
        if forecast is not None:
            forecast_tp = float(forecast['yhat'].quantile(0.75)) if signal_type == "BUY" else float(forecast['yhat'].quantile(0.25))
            forecast_sl = float(forecast['yhat_lower'].min()) if signal_type == "BUY" else float(forecast['yhat_upper'].max())
            if signal_type == "BUY":
                sl = min(forecast_sl, support_zone[0], current_price * 0.98)
                tp = max(forecast_tp, resistance_zone[1], current_price * 1.02)
            else:
                sl = max(forecast_sl, resistance_zone[1], current_price * 1.02)
                tp = min(forecast_tp, support_zone[0], current_price * 0.98)
    if signal_type != "NO SIGNAL":
        risk = abs(current_price - sl)
        reward = abs(tp - current_price)
        if risk > 0 and reward / risk < 1.5:
            if signal_type == "BUY":
                tp = current_price + risk * 1.5
            else:
                tp = current_price - risk * 1.5
    current_price_str = format_price(current_price, current_price)
    sl_str = "N/A" if signal_type == "NO SIGNAL" else format_price(sl, current_price)
    tp_str = "N/A" if signal_type == "NO SIGNAL" else format_price(tp, current_price)
    signal_status = "🟢 BUY" if signal_type == "BUY" else "🔴 SELL" if signal_type == "SELL" else "🟡 NO SIGNAL"
    rsi_trend = "Bullish Trend" if bullish_rsi else "Bearish Trend"
    stoch_trend = "Bullish Trend" if bullish_stoch else "Bearish Trend"
    ema_trend = f"EMA100 {format_price(emas['ema100'], current_price)} is {'Above' if bullish_ema else 'Below' if bearish_ema else 'Equal to'} EMA200 {format_price(emas['ema200'], current_price)} → {'Uptrend' if bullish_ema else 'Downtrend' if bearish_ema else 'Neutral'}"
    keltner_status = f"{'Above Upper' if current_price > upper_kc else 'Below Lower' if current_price < lower_kc else 'Within'} range: Upper {format_price(upper_kc, current_price)}, Lower {format_price(lower_kc, current_price)}"
    volume_status = f"{'Met' if vol > volume_threshold else 'Not Met'} $Vol < Avg × 1.5$"
    confidence_status = f"{confidence:.1f}% ${'High' if confidence >= 75 else 'Medium' if confidence >= 60 else 'Low'}$"
    support_zone_str = f"{format_price(support_zone[0], current_price)} → {format_price(support_zone[1], current_price)}"
    resistance_zone_str = f"{format_price(resistance_zone[0], current_price)} → {format_price(resistance_zone[1], current_price)}"
    analysis_section = (
        f"\n*📊 TRADING SIGNAL ANALYSIS*\n"
        f"```\n"
        f"{'Indicator':<20} {'Value':<60}\n"
        f"{'🔹 RSI':<20} {format_strategy_number(rsi.iloc[-1]):<10} → {rsi_trend:<40}\n"
        f"{'🔹 Stochastic':<20} %K {format_strategy_number(stoch_k.iloc[-1])}, %D {format_strategy_number(stoch_d.iloc[-1])} → {stoch_trend:<40}\n"
        f"{'🔹 EMA Trend':<20} {ema_trend:<60}\n"
        f"{'🔹 Keltner':<20} {keltner_status:<60}\n"
        f"{'🔹 Volume':<20} {volume_status:<60}\n"
        f"{'🔹 Confidence':<20} {confidence_status:<60}\n"
        f"{'🔹 Support Zone':<20} {support_zone_str:<60}\n"
        f"{'🔹 Resistance Zone':<20} {resistance_zone_str:<60}\n"
        f"```\n"
    )
    breakout_summary = ""
    if signal_type == "NO SIGNAL":
        logger.info(f"Simulating breakout scenarios for {df.name}")
        df_bullish = df.copy()
        df_bearish = df.copy()
        df_bullish.iloc[-1, df_bullish.columns.get_loc('close')] = resistance_zone[1] * 1.01
        df_bullish.iloc[-1, df_bullish.columns.get_loc('high')] = max(df_bullish.iloc[-1]['high'], resistance_zone[1] * 1.01)
        df_bullish.iloc[-1, df_bullish.columns.get_loc('low')] = min(df_bullish.iloc[-1]['low'], resistance_zone[1] * 1.01)
        df_bearish.iloc[-1, df_bearish.columns.get_loc('close')] = support_zone[0] * 0.99
        df_bearish.iloc[-1, df_bearish.columns.get_loc('high')] = max(df_bearish.iloc[-1]['high'], support_zone[0] * 0.99)
        df_bearish.iloc[-1, df_bearish.columns.get_loc('low')] = min(df_bearish.iloc[-1]['low'], support_zone[0] * 0.99)
        rsi_bull = ta.momentum.RSIIndicator(df_bullish['close']).rsi().iloc[-1]
        stoch_bull = ta.momentum.StochasticOscillator(df_bullish['high'], df_bullish['low'], df_bullish['close']).stoch().iloc[-1]
        rsi_bear = ta.momentum.RSIIndicator(df_bearish['close']).rsi().iloc[-1]
        stoch_bear = ta.momentum.StochasticOscillator(df_bearish['high'], df_bearish['low'], df_bearish['close']).stoch().iloc[-1]
        bullish_signal = "BUY" if rsi_bull > 56 and stoch_bull > 50 else "NO SIGNAL"
        bearish_signal = "SELL" if rsi_bear < 44 and stoch_bear < 50 else "NO SIGNAL"
        bull_tp = resistance_zone[1] * 1.03 if bullish_signal == "BUY" else "N/A"
        bull_sl = current_price * 0.98 if bullish_signal == "BUY" else "N/A"
        bear_tp = support_zone[0] * 0.97 if bearish_signal == "SELL" else "N/A"
        bear_sl = current_price * 1.02 if bearish_signal == "SELL" else "N/A"
        if bullish_signal == "BUY" or bearish_signal == "SELL":
            forecast = forecast_prices(df, periods=30)
            if forecast is not None:
                if bullish_signal == "BUY":
                    bull_tp = max(float(forecast['yhat'].quantile(0.75)), resistance_zone[1] * 1.03)
                if bearish_signal == "SELL":
                    bear_tp = min(float(forecast['yhat'].quantile(0.25)), support_zone[0] * 0.97)
        bull_tp_str = format_price(bull_tp, df['close'].iloc[-1])
        bull_sl_str = format_price(bull_sl, df['close'].iloc[-1])
        bear_tp_str = format_price(bear_tp, df['close'].iloc[-1])
        bear_sl_str = format_price(bear_sl, df['close'].iloc[-1])
        breakout_summary = (
            f"\n*🔮 HYPOTHETICAL BREAKOUT SCENARIOS $Dynamic Prediction$*\n"
            f"*📈 Bullish Breakout → If price breaks above resistance {format_price(resistance_zone[1], df['close'].iloc[-1])}*\n"
            f"```\n"
            f"{'Metric':<12} {'Value':<15}\n"
            f"{'RSI':<12} {format_strategy_number(rsi_bull):<15}\n"
            f"{'Stochastic':<12} {format_strategy_number(stoch_bull):<15}\n"
            f"{'Signal':<12} {bullish_signal:<15}\n"
            f"{'TP Target':<12} {bull_tp_str:<15}\n"
            f"{'SL Level':<12} {bull_sl_str:<15}\n"
            f"```\n"
            f"*📉 Bearish Breakdown → If price breaks below support {format_price(support_zone[0], df['close'].iloc[-1])}*\n"
            f"```\n"
            f"{'Metric':<12} {'Value':<15}\n"
            f"{'RSI':<12} {format_strategy_number(rsi_bear):<15}\n"
            f"{'Stochastic':<12} {format_strategy_number(stoch_bear):<15}\n"
            f"{'Signal':<12} {bearish_signal:<15}\n"
            f"{'TP Target':<12} {bear_tp_str:<15}\n"
            f"{'SL Level':<12} {bear_sl_str:<15}\n"
            f"```\n"
        )
    final_message = (
        f"💎 *Premium Signal for {df.name}*\n"
        f"Status: {signal_status}\n"
        f"Current Price: {current_price_str}\n"
        f"SL: {sl_str}\n"
        f"TP: {tp_str}\n"
        f"{analysis_section}"
        f"{breakout_summary}"
    )
    final_message = escape_markdown(final_message)
    save_path = f"{CHARTS_DIR}/{df.name.lower()}_chart.jpg"
    chart_base64 = ""
    if generate_chart_snapshot(df, df.name, save_path):
        with open(save_path, "rb") as image_file:
            chart_base64 = f"data:image/png;base64,{base64.b64encode(image_file.read()).decode('utf-8')}"
    snapshot_object = {
        "status": signal_type,
        "current_price": current_price,
        "tp": float(tp) if tp is not None else 0,
        "sl": float(sl) if sl is not None else 0,
        "indicators": {
            "rsi": f"{format_strategy_number(rsi.iloc[-1])} → {rsi_trend}",
            "stochastic": f"%K {format_strategy_number(stoch_k.iloc[-1])}, %D {format_strategy_number(stoch_d.iloc[-1])} → {stoch_trend}",
            "ema": ema_trend,
            "keltner": keltner_status,
            "volume": volume_status,
            "confidence": confidence_status,
        },
        "support_zone": support_zone_str,
        "resistance_zone": resistance_zone_str,
        "breakout": {
            "bullish": {
                "rsi": f"{format_strategy_number(rsi_bull)}" if signal_type == "NO SIGNAL" else None,
                "stochastic": f"{format_strategy_number(stoch_bull)}" if signal_type == "NO SIGNAL" else None,
                "signal": bullish_signal if signal_type == "NO SIGNAL" else None,
                "tp": bull_tp_str if signal_type == "NO SIGNAL" else None,
                "sl": bull_sl_str if signal_type == "NO SIGNAL" else None,
            },
            "bearish": {
                "rsi": f"{format_strategy_number(rsi_bear)}" if signal_type == "NO SIGNAL" else None,
                "stochastic": f"{format_strategy_number(stoch_bear)}" if signal_type == "NO SIGNAL" else None,
                "signal": bearish_signal if signal_type == "NO SIGNAL" else None,
                "tp": bear_tp_str if signal_type == "NO SIGNAL" else None,
                "sl": bear_sl_str if signal_type == "NO SIGNAL" else None,
            }
        }
    }
    return {
        "signal": signal_type,
        "tp": float(tp) if tp is not None else 0,
        "sl": float(sl) if sl is not None else 0,
        "chart_base64": chart_base64,
        "snapshot": snapshot_object,
    }, True

# === Flask App Setup ===
app = Flask(__name__)
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze() -> Tuple[Dict[str, Any], int]:
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            logger.error("Invalid request: Missing 'symbol' in JSON payload")
            return jsonify({"error": "Missing 'symbol' in request"}), 400
        symbol = data['symbol'].upper()
        if not symbol.endswith('USDT'):
            logger.error(f"Invalid symbol format: {symbol}. Must end with USDT")
            return jsonify({"error": "Invalid symbol format. Must end with USDT."}), 400
        df = fetch_candles(symbol)
        if df is None:
            logger.error(f"Failed to fetch candle data for {symbol}")
            return jsonify({"signal": "NO SIGNAL", "tp": 0, "sl": 0, "chart_base64": "", "snapshot": "Error: Failed to fetch candle data"}), 500
        df.name = symbol
        result, is_valid = run_strategy(df)
        status_code = 200 if is_valid else 500
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False)