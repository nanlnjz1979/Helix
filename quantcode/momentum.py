# -*- coding: utf-8 -*-
"""
简单动量策略示例：
- 使用 Akshare 获取 A 股样本数据
- 使用 Backtrader 实现基于固定回看窗口的动量策略并回测
- 参数通过 StrategyParams 类配置（不使用命令行）

依赖安装：
    pip install akshare backtrader pandas matplotlib

运行示例：
    直接运行脚本，内部 StrategyParams 默认配置可修改
"""

import argparse
import datetime as dt
import pandas as pd
import akshare as ak
import backtrader as bt
import json

# 输入参数类
class StrategyParams:
    def __init__(self):
        # 基本交易逻辑参数
        self.lookback = 60       # 动量回看窗口（天）
        self.entry = 0.05        # 入场动量阈值（5%）
        self.exit = 0.0          # 出场动量阈值（0%）
        # 风控参数
        self.stop_loss = 0.05    # 止损比例（5%）
        self.take_profit = 0.2   # 止盈比例（20%）
        # 数据周期与标的
        self.period = "1d"       # 数据周期："1d" 或 "1h"
        self.symbol = "000001"   # 股票代码，如 000001、600519
        self.start = "2018-01-01"# 起始日期
        self.end = dt.date.today().isoformat() # 结束日期
        self.adjust = "qfq"       # 复权方式：qfq/hfq/None


def _prefix_symbol_for_minute(symbol: str) -> str:
    """为分钟数据添加交易所前缀（sz/sh）。"""
    if symbol.startswith("6"):
        return f"sh{symbol}"
    elif symbol.startswith("0") or symbol.startswith("3"):
        return f"sz{symbol}"
    else:
        return symbol


def fetch_akshare_data(symbol: str, start: str, end: str, adjust: str = "qfq", period: str = "1d") -> pd.DataFrame:
    """从 Akshare 获取 A 股数据并转成 Backtrader 需要的格式。

    返回包含列：['open', 'high', 'low', 'close', 'volume']，索引为 pandas.DatetimeIndex。
    支持日线（"1d"）与分钟线（"1h"，聚合为60分钟）。
    """
    if period.lower() in ("1d", "daily"):
        start_ak = start.replace("-", "")
        end_ak = end.replace("-", "")
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_ak, end_date=end_ak, adjust=adjust)
        if df is None or df.empty:
            raise ValueError(f"Akshare 未获取到日线数据：symbol={symbol}, start={start}, end={end}, adjust={adjust}")
        # 标准化字段名
        rename_map = {
            "日期": "date",
            "开盘": "open",
            "最高": "high",
            "最低": "low",
            "收盘": "close",
            "成交量": "volume",
        }
        df = df.rename(columns=rename_map)
        keep_cols = ["date", "open", "high", "low", "close", "volume"]
        df = df[keep_cols]
        df["date"] = pd.to_datetime(df["date"])
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df = df.dropna(subset=["open", "high", "low", "close"]).copy()
        df["volume"] = df["volume"].fillna(0)
        df = df.set_index("date").sort_index()
        return df
    elif period.lower() == "1h":
        # 获取分钟数据并聚合为1小时
        symbol_min = _prefix_symbol_for_minute(symbol)
        try:
            mdf = ak.stock_zh_a_minute(symbol=symbol_min, period="60", adjust=adjust)
        except Exception as e:
            raise ValueError(f"Akshare 分钟数据获取失败：{symbol_min}, period=60, adjust={adjust}, err={e}")
        if mdf is None or mdf.empty:
            raise ValueError(f"Akshare 未获取到分钟数据：symbol={symbol_min}")
        # 列名标准化与索引
        # 兼容不同返回格式
        if "datetime" in mdf.columns:
            mdf["datetime"] = pd.to_datetime(mdf["datetime"])
            mdf = mdf.set_index("datetime")
        elif "时间" in mdf.columns:
            mdf["时间"] = pd.to_datetime(mdf["时间"])
            mdf = mdf.set_index("时间")
        else:
            raise ValueError("分钟数据缺少 datetime/时间 列")
        # 映射数值列
        col_map_candidates = [
            {"开盘": "open", "最高": "high", "最低": "low", "收盘": "close", "成交量": "volume"},
            {"open": "open", "high": "high", "low": "low", "close": "close", "volume": "volume"},
        ]
        for cmap in col_map_candidates:
            if set(cmap.keys()).issubset(set(mdf.columns)):
                mdf = mdf.rename(columns=cmap)
                break
        needed = {"open", "high", "low", "close", "volume"}
        if not needed.issubset(set(mdf.columns)):
            raise ValueError("分钟数据列名不符合预期")
        # 过滤日期区间并确保类型
        mdf = mdf.loc[(mdf.index >= pd.to_datetime(start)) & (mdf.index <= pd.to_datetime(end))]
        for col in ["open", "high", "low", "close", "volume"]:
            mdf[col] = pd.to_numeric(mdf[col], errors="coerce")
        mdf = mdf.dropna(subset=["open", "high", "low", "close"]).copy()
        mdf["volume"] = mdf["volume"].fillna(0)
        # 已经是60分钟周期，直接返回
        return mdf.sort_index()
    else:
        raise ValueError(f"不支持的 period: {period}，仅支持 '1d' 或 '1h'")


class MomentumStrategy(bt.Strategy):
    params = dict(
        lookback=60,   # 动量回看窗口（天）
        entry=0.05,    # 入场阈值：最近 lookback 天涨幅 > 5%
        exit=0.0,      # 出场阈值：最近 lookback 天涨幅 < 0%
        stop_loss=0.05,# 止损比例
        take_profit=0.2,# 止盈比例
        printlog=True, # 是否打印日志
    )

    def log(self, txt):
        if self.p.printlog:
            dt_str = self.datas[0].datetime.datetime(0).isoformat()
            print(f"{dt_str} - {txt}")

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        if order.status == order.Completed:
            action = 'BUY' if order.isbuy() else 'SELL'
            self.log(f"ORDER {action}: price={order.executed.price:.3f}, cost={order.executed.value:.2f}, comm={order.executed.comm:.2f}")
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log(f"ORDER Failed: status={order.status}")

    def notify_trade(self, trade):
        if trade.isclosed:
            self.log(f"TRADE PnL: gross={trade.pnl:.2f}, net={trade.pnlcomm:.2f}")

    def next(self):
        # 等待足够的历史数据
        if len(self) <= self.p.lookback:
            return

        past_close = self.data.close[-self.p.lookback]
        curr_close = self.data.close[0]
        momentum = (curr_close / past_close) - 1.0

        # 风控：当有持仓时检查止损/止盈
        if self.position:
            avg_price = self.position.price
            ret_since_entry = (curr_close / avg_price) - 1.0
            if ret_since_entry <= -self.p.stop_loss:
                self.log(f"STOP LOSS: r={ret_since_entry:.3%} <= -{self.p.stop_loss:.0%}")
                self.close()
                return
            if ret_since_entry >= self.p.take_profit:
                self.log(f"TAKE PROFIT: r={ret_since_entry:.3%} >= {self.p.take_profit:.0%}")
                self.close()
                return

        # 信号与执行
        if not self.position:
            if momentum > self.p.entry:
                self.log(f"ENTER: momentum={momentum:.3%}")
                self.buy()
        else:
            if momentum < self.p.exit:
                self.log(f"EXIT: momentum={momentum:.3%}")
                self.close()


def generate_complete_performance_json(strat, results,stock_data,symbol,start_date,end_date):
    """
    Generate a complete JSON report of strategy performance including transactions and metrics.
    
    Args:
        strat: Backtrader strategy instance
        results: Backtrader cerebro run results
        
    Returns:
        str: JSON formatted performance report
    """
    # Initialize main result dictionary
    performance = {}
    # 0. Process strategy details
    #symbol,start_date,end_date
    # "stock": {
    #"stock_num": "00100",
    #"stock_name": "tcl"
    try:
        start_date = bt.num2date(start_date).isoformat()
    except:
        start_date = str(start_date)

    try:
        end_date = bt.num2date(end_date).isoformat()
    except:
        end_date = str(end_date)

    performance['stock'] = {
        'stock_num': symbol,
        'stock_name': symbol,
        'start_date': start_date,
        'end_date': end_date
    }
    
    # 准备列映射，兼容英文/中文列名
    cols = set(stock_data.columns)
    if {'open','high','low','close','volume'}.issubset(cols):
        c_open, c_high, c_low, c_close, c_vol = 'open','high','low','close','volume'
    elif {'开盘','最高','最低','收盘','成交量'}.issubset(cols):
        c_open, c_high, c_low, c_close, c_vol = '开盘','最高','最低','收盘','成交量'
    else:
        raise ValueError('stock_data列名不符合预期，需要包含开盘/最高/最低/收盘/成交量或英文open/high/low/close/volume')

    # 确保索引为DatetimeIndex
    if not isinstance(stock_data.index, pd.DatetimeIndex):
        if 'date' in stock_data.columns:
            stock_data['date'] = pd.to_datetime(stock_data['date'])
            stock_data = stock_data.set_index('date').sort_index()
        elif '日期' in stock_data.columns:
            stock_data['日期'] = pd.to_datetime(stock_data['日期'])
            stock_data = stock_data.set_index('日期').sort_index()
        else:
            raise ValueError('stock_data需要DatetimeIndex或包含date/日期列')

    performance['stockdata'] = [
        {
            "trade_date": idx.strftime('%Y%m%d'),
            "open": float(row[c_open]),
            "high": float(row[c_high]),
            "low": float(row[c_low]),
            "close": float(row[c_close]),
            "vol": int(row[c_vol]) if pd.notna(row[c_vol]) else 0
        }
        for idx, row in stock_data.iterrows()
    ]
    
    # 1. Process transaction details
    transactions_analysis = results[0].analyzers.transactions.get_analysis()
  
    
    
    transactions_list = []
    for date, transactions in transactions_analysis.items():
        # Convert timestamp to ISO format string (handle Backtrader's numeric timestamp)
        
        try:
            # Convert Backtrader's internal numeric timestamp to datetime
            transaction_datetime = bt.num2date(date)
            datetime_str = transaction_datetime.isoformat()
        except:
            # Fallback in case of timestamp format issues
            datetime_str = str(date.strftime("%Y%m%d"))
            
        for trans in transactions:
            # Ensure proper type conversion for JSON serialization
            transaction = {
                'datetime': datetime_str,
                'amount': float(trans[0]),  # Convert to float for consistency
                'price': float(trans[1]),
                'sid': str(trans[2]),       # Convert to string to handle any ID type
                'symbol': str(trans[3]),    # Ensure symbol is string
                'value': float(trans[4])
            }
            transactions_list.append(transaction)
    
    performance['transactions'] = transactions_list
    performance['transaction_count'] = len(transactions_list)  # Add total transaction count
    
    # 2. Process return metrics
    returns = strat.analyzers.returns.get_analysis()
    performance['returns'] = {
        'cumulative_return': round(float(returns['rtot']), 4),  # Total return (decimal)
        'annualized_return_pct': round(float(returns['rnorm100']), 2),  # Annualized (%)
        'avg_daily_return': round(float(returns['ravg']), 6)  # Average daily (decimal)
    }
    
    # 3. Process drawdown metrics
    drawdown = strat.analyzers.drawdown.get_analysis()
    performance['drawdown'] = {
        'max_drawdown_pct': round(float(drawdown['max']['drawdown']), 2),
        'max_drawdown_days': int(drawdown['max']['len']),
        'current_drawdown_pct': round(float(drawdown['drawdown']), 2)
    }
    
    # 4. Process risk metrics (Sharpe ratio)
    sharpe = strat.analyzers.sharpe.get_analysis()
    performance['risk_metrics'] = {
        'sharpe_ratio': round(float(sharpe['sharperatio']), 2)
    }
    
    # 5. Process trade statistics
    trade_stats = strat.analyzers.trade_analyzer.get_analysis()
    total_trades = int(trade_stats['total']['total'])
    won_trades = int(trade_stats.get('won', {}).get('total', 0))
    lost_trades = int(trade_stats.get('lost', {}).get('total', 0))
    
    win_rate = (won_trades / total_trades * 100) if total_trades > 0 else 0.0
    avg_win = float(trade_stats.get('won', {}).get('pnl', {}).get('average', 0.0)) if won_trades > 0 else 0.0
    avg_lost = float(trade_stats.get('lost', {}).get('pnl', {}).get('average', 0.0)) if lost_trades > 0 else 0.0
    win_loss_ratio = abs(avg_win / avg_lost) if avg_lost != 0 else 0.0
    
    performance['trade_statistics'] = {
        'total_trades': total_trades,
        'winning_trades': won_trades,
        'losing_trades': lost_trades,
        'win_rate_pct': round(win_rate, 2),
        'avg_win': round(avg_win, 2),
        'avg_loss': round(avg_lost, 2),
        'win_loss_ratio': round(win_loss_ratio, 2)
    }
    
    # 6. Process System Quality Number (SQN)
    sqn = strat.analyzers.sqn.get_analysis()
    performance['system_quality'] = {
        'sqn': round(float(sqn['sqn']), 2)
    }
    
    # 7. Process time-based returns (first 50 entries)
    time_returns = strat.analyzers.time_return.get_analysis()
    time_returns_dict = {}
    
    for i, (timestamp, ret) in enumerate(time_returns.items()):
        # Convert timestamp to ISO format string
        try:
            time_str = bt.num2date(timestamp).isoformat()
        except:
            time_str = str(timestamp)
        time_returns_dict[time_str] = round(float(ret), 6)
    
    performance['time_returns'] = time_returns_dict
    
    # Convert to JSON with proper formatting
    ret = json.dumps(performance, ensure_ascii=False)
    #ret = json.dumps(performance)
    return ret

def run_backtest(params: StrategyParams):
    # 获取数据
    df = fetch_akshare_data(symbol=params.symbol, start=params.start, end=params.end, adjust=(None if params.adjust == "None" else params.adjust), period=params.period)

    data = bt.feeds.PandasData(dataname=df)

    cerebro = bt.Cerebro()
    cerebro.adddata(data)

    # 添加策略
    cerebro.addstrategy(MomentumStrategy, lookback=params.lookback, entry=params.entry, exit=params.exit, stop_loss=params.stop_loss, take_profit=params.take_profit, printlog=True)

    # 仓位配置：使用百分比 sizer
    cerebro.addsizer(bt.sizers.PercentSizer, percents=95)

    # 初始资金与手续费（不含印花税简化场景）
    cerebro.broker.setcash(100000.0)
    cerebro.broker.setcommission(commission=0.0005)  # 双边 0.05%

    # 分析器
    cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name='sharpe')
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name='ddown')
    cerebro.addanalyzer(bt.analyzers.TimeReturn, _name='timeret')

    cerebro.addanalyzer(bt.analyzers.Returns, _name="returns")
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name="drawdown")
    cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name="sharpe")
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trade_analyzer")
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trades")
    cerebro.addanalyzer(bt.analyzers.Transactions, _name="transactions")
    cerebro.addanalyzer(bt.analyzers.TimeReturn, _name="time_return", timeframe=bt.TimeFrame.Days)
    cerebro.addanalyzer(bt.analyzers.SQN, _name="sqn")

    # 回测
    results = cerebro.run()
    strat = results[0]

    # 输出结果
    
    final_value = cerebro.broker.getvalue()
    print("\n=== 回测结果摘要 ===")
    print(f"最终资产净值: {final_value:,.2f}")
    sharpe = strat.analyzers.sharpe.get_analysis()
    ddown = strat.analyzers.ddown.get_analysis()
    print(f"夏普比率: {sharpe.get('sharperatio', None)}")
    if ddown:
        print(f"最大回撤: {ddown.get('max', {}).get('drawdown', None)}%")


    print("data")
    perf_json = generate_complete_performance_json(strat, results, df, params.symbol, params.start, params.end)
    print(perf_json)
    print("done")


def main():
    # 使用类配置参数，而非命令行
    params = StrategyParams()
    # 你可以在这里修改默认参数，例如：
    # params.symbol = "600519"
    # params.period = "1h"
    # params.lookback = 120
    # params.entry = 0.08
    # params.exit = 0.02
    # params.stop_loss = 0.05
    # params.take_profit = 0.2
    run_backtest(params)


if __name__ == "__main__":
    main()