import backtrader as bt
import akshare as ak
import pandas as pd
import json
from datetime import datetime, timedelta

class MACDStrategy(bt.Strategy):
    params = (
        ('macd1', 12),
        ('macd2', 26),
        ('macdsig', 9),
    )

    def __init__(self):
        self.macd = bt.ind.MACD(
            self.data.close,
            period_me1=self.p.macd1,
            period_me2=self.p.macd2,
            period_signal=self.p.macdsig
        )
        self.crossover = bt.ind.CrossOver(self.macd.macd, self.macd.signal)

        # Remove these lines as plotting is handled by cerebro.plot()
        # self.macd.plotinfo.plot = True
        # self.macd.signal.plotinfo.plot = True
        # self.crossover.plotinfo.plot = False # Don't plot the crossover indicator itself

    def next(self):
        if self.crossover > 0:
            self.buy()
        elif self.crossover < 0:
            self.sell()


def generate_complete_performance_json(strat, results,data,symbol,start_date,end_date):
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
    
    performance['stockdata'] = [
        {
            #"trade_date": row['日期'].strftime('%Y%m%d'),  # 假设日期列名为'日期'
            "trade_date": index.strftime('%Y%m%d'),
            "open": float(row['开盘']),
            "high": float(row['最高']),
            "low": float(row['最低']),
            "close": float(row['收盘']),
            "vol": int(row['成交量'])
        }
        for index, row in stock_data.iterrows()
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
            datetime_str = str(date)
            
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

# Usage Example:
# After running cerebro:
# results = cerebro.run()
# performance_json = generate_complete_performance_json(strat, results)
# print(performance_json)


if __name__ == '__main__':
    cerebro = bt.Cerebro()
    cerebro.addstrategy(MACDStrategy)

    # Set initial cash
    cerebro.broker.setcash(10000.0)

    # Fetch data using AkShare
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5*365) # Approximately 5 years
    symbol="600519"
    stock_data = ak.stock_zh_a_hist(symbol, period="daily", start_date=start_date.strftime("%Y%m%d"), end_date=end_date.strftime("%Y%m%d"), adjust="qfq")
    stock_data['日期'] = pd.to_datetime(stock_data['日期'])
    stock_data.set_index('日期', inplace=True)

    # Create a Backtrader data feed
    #
    data = bt.feeds.PandasData(
        dataname=stock_data,
        datetime=None, # Index is datetime
        open='开盘',
        high='最高',
        low='最低',
        close='收盘',
        volume='成交量',
        openinterest=-1
    )

    cerebro.adddata(data)
    # 关键：添加分析器时，必须指定 _name="returns"（与后续访问的名称对应）
    cerebro.addanalyzer(bt.analyzers.Returns, _name="returns")  # 收益率分析器
    cerebro.addanalyzer(bt.analyzers.DrawDown, _name="drawdown")  # 回撤分析器
    cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name="sharpe") # 夏普比率分析器
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trade_analyzer")# 交易统计分析器
    cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name="trades")
    cerebro.addanalyzer(bt.analyzers.Transactions, _name="transactions")#交易记录分析器
    cerebro.addanalyzer(bt.analyzers.TimeReturn, _name="time_return", timeframe=bt.TimeFrame.Days)#时间周期收益率分析器（按日计算收益）
    cerebro.addanalyzer(bt.analyzers.SQN, _name="sqn")
    # 其他分析器同理...

    # Run the backtest
    #print('Starting Portfolio Value: %.2f' % cerebro.broker.getvalue())
    
    results = cerebro.run()
    strat = results[0]
    
    performance = {
    '初始资金': cerebro.broker.startingcash,
    '最终资金': cerebro.broker.getvalue(),
    '累计收益': strat.analyzers.returns.get_analysis()['rtot'],
    '年化收益率(%)': strat.analyzers.returns.get_analysis()['rnorm100'],
    '最大回撤(%)': strat.analyzers.drawdown.get_analysis()['max']['drawdown'],
    '夏普比率': strat.analyzers.sharpe.get_analysis()['sharperatio'],
    '总交易次数': strat.analyzers.trade_analyzer.get_analysis()['total']['total'],
    '胜率(%)': (strat.analyzers.trade_analyzer.get_analysis()['won']['total'] / 
               strat.analyzers.trade_analyzer.get_analysis()['total']['total']) * 100
    }
    print("data")
    performance_json = generate_complete_performance_json(strat, results,stock_data,symbol,start_date,end_date)
    print(performance_json)
    print("done")
    