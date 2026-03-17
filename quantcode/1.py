import pandas as pd
import numpy as np
import json
import backtrader as bt
import os

class ImmediateExecutionBroker(bt.brokers.BackBroker):
    """自定义立即执行broker，确保订单立即成交"""
    
    params = (
        ('commission', 0.001),  # 默认佣金率
        ('coc', True),
        ('coo', True),
    )
    
    def __init__(self):
        super().__init__()
        # 使用父类的初始化，确保所有必要的属性都被正确初始化
    
    def buy(self, owner, data, size, price=None, plimit=None,
            exectype=None, valid=None, tradeid=0, oco=None,
            trailamount=None, trailpercent=None, parent=None,
            transmit=True, **kwargs):
        """创建并立即执行买入订单"""
        # 调用父类的buy方法，确保订单被正确创建和处理
        order = super().buy(owner=owner, data=data, size=size,
                           price=price, exectype=exectype, valid=valid,
                           tradeid=tradeid, oco=oco,
                           trailamount=trailamount, trailpercent=trailpercent,
                           parent=parent, transmit=transmit)
        
        # 立即执行订单
        self._try_exec(order)
        
        return order
    
    def sell(self, owner, data, size, price=None, plimit=None,
             exectype=None, valid=None, tradeid=0, oco=None,
             trailamount=None, trailpercent=None, parent=None,
             transmit=True, **kwargs):
        """创建并立即执行卖出订单"""
        # 调用父类的sell方法，确保订单被正确创建和处理
        order = super().sell(owner=owner, data=data, size=size,
                            price=price, exectype=exectype, valid=valid,
                            tradeid=tradeid, oco=oco,
                            trailamount=trailamount, trailpercent=trailpercent,
                            parent=parent, transmit=transmit)
        
        # 立即执行订单
        self._try_exec(order)
        
        return order
    
    def _try_exec(self, order):
        """尝试执行订单，立即成交"""
        # 使用当前收盘价作为执行价格
        price = order.data.close[0]
        
        # 执行订单
        self._execute(order, ago=0, price=price)
        
        # 如果订单仍然存活，将其从pending队列中移除
        if order in self.pending:
            self.pending.remove(order)
    
    def _process_order(self, order):
        """处理订单，包括提交和执行"""
        # 调用父类的_process_order方法
        super()._process_order(order)
        
        # 立即执行订单
        self._try_exec(order)
    
    def submit(self, order, check=True):
        """提交订单并立即执行"""
        # 调用父类的submit方法，确保订单被正确添加到pending队列
        order = super().submit(order, check)
        
        # 立即执行订单
        self._try_exec(order)
        
        return order

class ReturnAnalyzer(bt.Analyzer):
    def __init__(self):
        # 调用父类的__init__方法，确保基类的初始化逻辑被执行
        super().__init__()
        
        self.datas = self.strategy.datas
        self.entry_prices = {data._name: None for data in self.datas}
        self.entry_sizes = {data._name: 0.0 for data in self.datas}  # 记录每只股票的买入数量
        self.position_returns = []
        self.total_returns = []
        self.daily_returns = []  # 记录每天的总投资收益率（用于计算夏普比率）
        self.day = 0
        self.sold = False
        self.final_pos_open = 0.0
        self.final_pos_high = 0.0
        self.final_pos_low = 0.0
        self.final_pos_close = 0.0
        self.final_total_open = 0.0
        self.final_total_high = 0.0
        self.final_total_low = 0.0
        self.final_total_close = 0.0
        self.initial_value = None  # 初始总投资价值
        self.stock_values = {data._name: 0.0 for data in self.datas}  # 每只股票的买入金额
        self.sharpe_ratio = 0.0  # 总夏普比率
        self.rolling_sharpe = {}  # 滚动夏普比率，键为窗口大小（天）
        self.trades = []  # 记录所有交易的列表
        self.base = 1000  # 设置基数为1000
        
        # 回测进度计算相关
        self.total_days = None  # 回测总天数（next方法的总调用次数）
        self.last_progress = -1  # 上一次打印的进度百分比
    
    def start(self):
        """
        策略开始时调用，计算next方法的总调用次数
        在Backtrader中，start方法在策略开始执行前调用，此时数据已经加载完成
        """
        if self.datas and len(self.datas) > 0:
            # 考虑指标周期，最大的指标周期是120（longest_period），需要减去该周期
            data_length = self.datas[0].buflen()
            # 策略中使用的最大指标周期是longest_period=120和atr_period=14，所以减去120
            self.total_days = max(0, data_length )
            print(f"回测总天数（next总调用次数）: {self.total_days}")
        else:
            self.total_days = 0
    
    def _print_progress(self):
        """
        计算并打印回测进度百分比
        格式：PROGRESS X，其中X是整数百分比
        """
        if self.total_days is None or self.total_days == 0:
            return
        
        # 计算当前进度百分比
        progress = int((self.day / self.total_days) * 100)
        
        # 确保进度不会超过100%
        progress = min(progress, 100)
        
        # 只在进度变化时打印，避免重复打印
        if progress != self.last_progress:
            print(f"PROGRESS {progress}")
            self.last_progress = progress
    
    def next(self):
        date = self.datas[0].datetime.date(0)
        
        if self.initial_value is None:
            # 获取初始总投资价值
            self.initial_value = self.strategy.broker.getvalue()
        
        # 获取当前broker的现金和股票持仓
        current_cash = self.strategy.broker.getcash()
        
        # 计算当天开高低收对应的总市值
        total_value_open = current_cash
        total_value_high = current_cash
        total_value_low = current_cash
        total_value_close = current_cash
        
        # 遍历所有股票，计算不同价格下的总市值
        for data in self.datas:
            # 获取当前持仓数量
            position_size = self.strategy.getposition(data).size
            if position_size > 0:
                # 计算开高低收对应的股票价值
                open_value = data.open[0] * position_size
                high_value = data.high[0] * position_size
                low_value = data.low[0] * position_size
                close_value = data.close[0] * position_size
                
                # 累加到总市值中
                total_value_open += open_value
                total_value_high += high_value
                total_value_low += low_value
                total_value_close += close_value
        
        # 计算开高低收对应的收益率
        open_return = (total_value_open - self.initial_value) / self.initial_value
        high_return = (total_value_high - self.initial_value) / self.initial_value
        low_return = (total_value_low - self.initial_value) / self.initial_value
        close_return = (total_value_close - self.initial_value) / self.initial_value
        
        # 记录收益率，开高低收四个数字反映当天的实际波动情况
        self.position_returns.append([date, open_return, high_return, low_return, close_return])
        self.total_returns.append([date, open_return, high_return, low_return, close_return])
        
        # 记录每天的总投资收益率（用于计算夏普比率）
        self.daily_returns.append(close_return)
        
        self.day += 1
        
        # 保存当前收益率，以便卖出后使用
        self.final_pos_open = open_return
        self.final_pos_high = high_return
        self.final_pos_low = low_return
        self.final_pos_close = close_return
        self.final_total_open = open_return
        self.final_total_high = high_return
        self.final_total_low = low_return
        self.final_total_close = close_return
        
        # 重置sold状态
        self.sold = False
        
        # 打印回测进度
        self._print_progress()
    
    def notify_order(self, order):
        if order.status == order.Completed:
            data = order.data
            # 获取交易时间
            trade_time = self.datas[0].datetime.datetime(0)
            
            # 计算实际交易价值
            if order.isbuy():
                # 买入时，value = 买入价格 * 买入数量
                actual_value = order.executed.price * order.executed.size
            else:
                # 卖出时，value = 卖出价格 * 卖出数量的绝对值
                actual_value = order.executed.price * abs(order.executed.size)
            
            # 记录交易数据
            trade = {
                'time': trade_time,
                'symbol': data._name,
                'type': 'buy' if order.isbuy() else 'sell',
                'price': order.executed.price,
                'size': order.executed.size,
                'value': actual_value,
                'commission': order.executed.comm
            }
            print(f"订单完成：{order.ref} - 时间：{trade_time} - 类型：{trade['type']} - 股票：{trade['symbol']} - 价格：{trade['price']:.2f} - 数量：{trade['size']:.2f} - 价值：{trade['value']:.2f} - 佣金：{trade['commission']:.2f}")
            self.trades.append(trade)
            
            if order.isbuy():
                self.entry_prices[data._name] = order.executed.price
                self.entry_sizes[data._name] = order.executed.size  # 记录实际买入数量
                # 记录每只股票的买入金额
                self.stock_values[data._name] = actual_value
                # 有新买入，重置sold状态
                self.sold = False
            elif order.issell():
                # 检查该股票是否还有剩余持仓
                remaining_size = self.strategy.getposition(data).size
                if remaining_size == 0:
                    # 全部卖出，重置相关数据
                    self.entry_prices[data._name] = None  # 重置买入价格
                    self.entry_sizes[data._name] = 0.0  # 重置买入数量
                    self.stock_values[data._name] = 0.0  # 重置股票持仓金额
                else:
                    # 部分卖出，更新持仓金额
                    # 计算剩余持仓价值 = 剩余数量 * 当前价格
                    remaining_value = remaining_size * data.close[0]
                    self.stock_values[data._name] = remaining_value
                
                # 检查是否还有任何持仓
                has_any_position = False
                for d in self.datas:
                    if self.strategy.getposition(d).size != 0:
                        has_any_position = True
                        break
                # 只有在全部卖出后才设置sold为True
                self.sold = not has_any_position
    
    def calculate_sharpe_ratio(self, returns, risk_free_rate=0.0, annualization_factor=252):
        """
        计算夏普比率
        
        参数：
        returns: 收益率列表
        risk_free_rate: 无风险利率，默认为0
        annualization_factor: 年化因子，默认为252个交易日
        
        返回：
        夏普比率
        """
        if len(returns) < 2:
            return 0.0
        
        # 计算日收益率（相对于前一天）
        daily_rets = []
        for i in range(1, len(returns)):
            daily_ret = returns[i] - returns[i-1]
            daily_rets.append(daily_ret)
        
        if not daily_rets:
            return 0.0
        
        # 计算平均日收益率和标准差
        avg_ret = pd.Series(daily_rets).mean()
        std_ret = pd.Series(daily_rets).std()
        
        if std_ret == 0:
            return 0.0
        
        # 计算夏普比率
        sharpe = (avg_ret - risk_free_rate) / std_ret
        # 年化处理
        sharpe = sharpe * (annualization_factor ** 0.5)
        
        return sharpe
    
    def calculate_rolling_sharpe(self, returns, window_sizes, risk_free_rate=0.0, annualization_factor=252):
        """
        计算滚动夏普比率
        
        参数：
        returns: 收益率列表
        window_sizes: 窗口大小列表（天）
        risk_free_rate: 无风险利率，默认为0
        annualization_factor: 年化因子，默认为252个交易日
        
        返回：
        滚动夏普比率字典，键为窗口大小，值为夏普比率
        """
        rolling_sharpe = {}
        
        for window in window_sizes:
            if len(returns) < window + 1:
                rolling_sharpe[window] = 0.0
                continue
            
            # 计算滚动夏普比率
            rolling_sharpe_values = []
            for i in range(len(returns) - window):
                window_returns = returns[i:i+window+1]
                sharpe = self.calculate_sharpe_ratio(window_returns, risk_free_rate, annualization_factor)
                rolling_sharpe_values.append(sharpe)
            
            # 使用最后一个滚动窗口的夏普比率作为该窗口大小的滚动夏普比率
            rolling_sharpe[window] = rolling_sharpe_values[-1] if rolling_sharpe_values else 0.0
        
        return rolling_sharpe
    
    def stop(self):
        """
        策略结束时调用，卖出所有持仓股票
        """
        print("\n===== 在ReturnAnalyzer.stop()中卖出所有持仓 =====")
        
        # 获取当前日期
        current_date = self.datas[0].datetime.datetime(0)
        
        # 遍历所有数据，卖出持仓股票
        for data in self.datas:
            # 获取当前持仓数量
            position = self.strategy.getposition(data)
            if position.size > 0:
                print(f"  卖出 {data._name}：持仓数量 {position.size}")
                
                # 直接记录交易数据，不依赖订单执行
                trade = {
                    'time': current_date,
                    'symbol': data._name,
                    'type': 'sell',
                    'price': data.close[0],  # 使用当前收盘价作为卖出价格
                    'size': -position.size,  # 卖出数量为负数
                    'value': data.close[0] * position.size,  # 交易价值
                    'commission': data.close[0] * position.size * self.strategy.broker.comminfo[None].p.commission  # 计算佣金
                }
                self.trades.append(trade)
                
                # 卖出所有持仓
                self.strategy.sell(data=data, size=position.size, exectype=bt.Order.Market)
            elif position.size < 0:
                print(f"  平仓 {data._name}：空头持仓数量 {position.size}")
                
                # 直接记录交易数据，不依赖订单执行
                trade = {
                    'time': current_date,
                    'symbol': data._name,
                    'type': 'buy',
                    'price': data.close[0],  # 使用当前收盘价作为买入价格
                    'size': abs(position.size),  # 买入数量为正数
                    'value': data.close[0] * abs(position.size),  # 交易价值
                    'commission': data.close[0] * abs(position.size) * self.strategy.broker.comminfo[None].p.commission  # 计算佣金
                }
                self.trades.append(trade)
                
                # 平仓空头持仓
                self.strategy.buy(data=data, size=abs(position.size), exectype=bt.Order.Market)
    
    def get_analysis(self):
        pos_df = pd.DataFrame(self.position_returns, columns=['date', 'open', 'high', 'low', 'close'])
        total_df = pd.DataFrame(self.total_returns, columns=['date', 'open', 'high', 'low', 'close'])
        
        # 将开高低收的数据转换为基于基数1000的数值：（1+开高低收的数）*1000
        for col in ['open', 'high', 'low', 'close']:
            pos_df[col] = (1 + pos_df[col]) * self.base
            total_df[col] = (1 + total_df[col]) * self.base
        
        # 在调用get_analysis时计算夏普比率
        # 计算总夏普比率
        sharpe_ratio = self.calculate_sharpe_ratio(self.daily_returns)
        
        # 计算滚动夏普比率（3个月=60天，6个月=120天，12个月=240天）
        window_sizes = [60, 120, 240]
        rolling_sharpe = self.calculate_rolling_sharpe(self.daily_returns, window_sizes)
        
        return {
            'position_returns': pos_df,
            'total_returns': total_df,
            'sharpe_ratio': sharpe_ratio,
            'rolling_sharpe': rolling_sharpe,
            'trades': self.trades  # 返回交易记录
        }

# 方案2：继承Cerebro类，封装分析器添加和结果生成功能
class MyCerebro(bt.Cerebro):
    """自定义Cerebro类，封装分析器添加和结果生成功能"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._trade_analyzer_added = False
        self._return_analyzer_added = False
        self._drawdown_analyzer_added = False
        self._sqn_analyzer_added = False
        self._returns_analyzer_added = False
    
    def run(self, *args, **kwargs):
        """重写run方法，自动添加分析器"""
        # 自动添加分析器
        if not self._return_analyzer_added:
            self.addanalyzer(ReturnAnalyzer, _name='myanalyzer')
            self._return_analyzer_added = True
        
        if not self._trade_analyzer_added:
            self.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trade_analyzer')
            self._trade_analyzer_added = True
        
        if not self._drawdown_analyzer_added:
            self.addanalyzer(bt.analyzers.DrawDown, _name='drawdown_analyzer')
            self._drawdown_analyzer_added = True
        
        if not self._sqn_analyzer_added:
            self.addanalyzer(bt.analyzers.SQN, _name='sqn_analyzer')
            self._sqn_analyzer_added = True
        
        if not self._returns_analyzer_added:
            self.addanalyzer(bt.analyzers.Returns, _name='returns_analyzer')
            self._returns_analyzer_added = True
        
        # 调用父类run方法
        self.results = super().run(*args, **kwargs)
        
        # 打印分析结果
        self.print_all_analysis_json()
        return self.results
    
    def _runstrategies(self, iterstrat):
        """重写_runstrategies方法，将runningstrats传递给broker"""
        # 调用父类方法
        results = super()._runstrategies(iterstrat)
        
        # 将runningstrats传递给broker
        if hasattr(self, 'broker') and hasattr(self.broker, 'set_runningstrats'):
            self.broker.set_runningstrats(self.runningstrats)
        
        return results
    
    def get_analysis_results(self):
        """获取分析器结果"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取自定义分析器结果
        analyzer = self.results[0].analyzers.myanalyzer.get_analysis()
        pos_returns = analyzer['position_returns']
        total_returns = analyzer['total_returns']
        
        return {
            'pos_returns': pos_returns,
            'total_returns': total_returns
        }
    
    def print_analyzer_results(self):
        """
        打印分析器结果
        """
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取结果
        analysis_results = self.get_analysis_results()
        pos_returns = analysis_results['pos_returns']
        total_returns = analysis_results['total_returns']
        
        print("\n每日持仓收益率：")
        for _, row in pos_returns.iterrows():
            print(f"{row['date'].strftime('%Y-%m-%d')}: 开 {row['open']:.4f}, 高 {row['high']:.4f}, 低 {row['low']:.4f}, 收 {row['close']:.4f}")
        
        print("\n每日总投资收益率：")
        for _, row in total_returns.iterrows():
            print(f"{row['date'].strftime('%Y-%m-%d')}: 开 {row['open']:.4f}, 高 {row['high']:.4f}, 低 {row['low']:.4f}, 收 {row['close']:.4f}")
        
        # 打印夏普比率结果
        print("\n===== 夏普比率分析结果 =====")
        # 获取自定义分析器的夏普比率结果
        analyzer = self.results[0].analyzers.myanalyzer.get_analysis()
        print(f"总夏普比率: {analyzer['sharpe_ratio']:.6f}")
        
        # 打印滚动夏普比率
        rolling_sharpe = analyzer['rolling_sharpe']
        print("\n滚动夏普比率：")
        for window, sharpe in rolling_sharpe.items():
            if window == 60:
                period = "3个月"
            elif window == 120:
                period = "6个月"
            elif window == 240:
                period = "12个月"
            else:
                period = f"{window}天"
            print(f"  {period}: {sharpe:.6f}")
    
    def print_trade_analyzer(self):
        """打印TradeAnalyzer结果"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取TradeAnalyzer结果
        trade_analyzer = self.results[0].analyzers.trade_analyzer.get_analysis()
        
        print("\n===== TradeAnalyzer详细结果 =====")
        
        # 打印交易总数
        total_trades = trade_analyzer.get('total', {})
        print(f"\n交易总数: {total_trades.get('total', 0)}")
        print(f"  已完成交易: {total_trades.get('closed', 0)}")
        print(f"  未完成交易: {total_trades.get('open', 0)}")
        
        # 打印盈利交易
        won_trades = trade_analyzer.get('won', {})
        print(f"\n盈利交易:")
        print(f"  总数: {won_trades.get('total', 0)}")
        won_pnl = won_trades.get('pnl', {})
        print(f"  总盈利: {won_pnl.get('total', 0):.2f}")
        print(f"  平均盈利: {won_pnl.get('average', 0):.2f}")
        
        # 打印亏损交易
        lost_trades = trade_analyzer.get('lost', {})
        print(f"\n亏损交易:")
        print(f"  总数: {lost_trades.get('total', 0)}")
        lost_pnl = lost_trades.get('pnl', {})
        print(f"  总亏损: {lost_pnl.get('total', 0):.2f}")
        print(f"  平均亏损: {lost_pnl.get('average', 0):.2f}")
        
        # 打印最长连续盈利/亏损
        streak = trade_analyzer.get('streak', {})
        print(f"\n连续交易:")
        print(f"  最长连续盈利: {streak.get('won', {}).get('longest', 0)}")
        print(f"  最长连续亏损: {streak.get('lost', {}).get('longest', 0)}")
        
        # 打印平均持有时间
        len_info = trade_analyzer.get('len', {})
        print(f"\n平均持有时间:")
        
        # 安全获取平均持有时间，处理可能的非字典类型
        total_len = len_info.get('total', 0)
        if isinstance(total_len, dict):
            total_avg = total_len.get('average', 0)
        else:
            total_avg = 0
        print(f"  平均: {total_avg:.2f} 天")
        
        won_len = len_info.get('won', 0)
        if isinstance(won_len, dict):
            won_avg = won_len.get('average', 0)
        else:
            won_avg = 0
        print(f"  盈利交易平均: {won_avg:.2f} 天")
        
        lost_len = len_info.get('lost', 0)
        if isinstance(lost_len, dict):
            lost_avg = lost_len.get('average', 0)
        else:
            lost_avg = 0
        print(f"  亏损交易平均: {lost_avg:.2f} 天")
        
        # 打印详细交易列表（如果有）
        if 'trades' in trade_analyzer:
            print(f"\n详细交易列表:")
            for i, trade in enumerate(trade_analyzer['trades'].values(), 1):
                print(f"\n  交易 {i}:")
                print(f"    盈利: {trade.get('pnl', 0):.2f}")
                print(f"    持有时间: {trade.get('len', 0)} 天")
                print(f"    开盘价: {trade.get('open', {}).get('price', 0):.2f}")
                print(f"    收盘价: {trade.get('close', {}).get('price', 0):.2f}")
    
    def print_drawdown_analyzer(self):
        """打印DrawDown分析器的所有数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取DrawDown分析器结果
        drawdown_analyzer = self.results[0].analyzers.drawdown_analyzer.get_analysis()
        
        print("\n===== DrawDown分析器详细结果 =====")
        
        # 打印所有DrawDown数据
        print(f"\n当前回撤: {drawdown_analyzer.get('drawdown', 0.0):.6f}")
        print(f"当前回撤金额: {drawdown_analyzer.get('moneydown', 0.0):.2f}")
        print(f"回撤次数: {drawdown_analyzer.get('len', 0)}")
        
        # 打印最大回撤信息
        max_drawdown = drawdown_analyzer.get('max', {})
        print(f"\n最大回撤:")
        print(f"  最大回撤值: {max_drawdown.get('drawdown', 0.0):.6f}")
        print(f"  最大回撤百分比: {max_drawdown.get('drawdown', 0.0) * 100:.2f}%")
        print(f"  最大回撤金额: {max_drawdown.get('moneydown', 0.0):.2f}")
        print(f"  最大回撤期间: {max_drawdown.get('len', 0)} 天")
        print(f"  最大回撤起始日期: {max_drawdown.get('fromdate', 'N/A')}")
        print(f"  最大回撤结束日期: {max_drawdown.get('todate', 'N/A')}")
        
        # 打印所有DrawDown数据的键值对
        print(f"\n所有DrawDown数据:")
        for key, value in drawdown_analyzer.items():
            if isinstance(value, dict):
                print(f"  {key}:")
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, float):
                        print(f"    {sub_key}: {sub_value:.6f}")
                    else:
                        print(f"    {sub_key}: {sub_value}")
            else:
                if isinstance(value, float):
                    print(f"  {key}: {value:.6f}")
                else:
                    print(f"  {key}: {value}")
    
    def get_analyzer_results_json(self):
        """将分析器结果组装成JSON数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取结果
        analysis_results = self.get_analysis_results()
        pos_returns = analysis_results['pos_returns']
        total_returns = analysis_results['total_returns']
        
        # 获取夏普比率结果
        analyzer = self.results[0].analyzers.myanalyzer.get_analysis()
        sharpe_ratio = analyzer['sharpe_ratio']
        rolling_sharpe = analyzer['rolling_sharpe']
        
        # 获取交易记录
        trades = analyzer['trades']
        
        # 转换为JSON格式
        data = {
            'position_returns': pos_returns.to_dict('records'),
            'total_returns': total_returns.to_dict('records'),
            'sharpe_ratio': sharpe_ratio,
            'rolling_sharpe': rolling_sharpe,
            'trades': trades  # 添加交易记录
        }
        
        return json.dumps(data, indent=2, default=str)
    
    def get_trade_analyzer_json(self):
        """将TradeAnalyzer结果组装成JSON数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取TradeAnalyzer结果
        trade_analyzer = self.results[0].analyzers.trade_analyzer.get_analysis()
        
        return json.dumps(trade_analyzer, indent=2, default=str)
    
    def get_drawdown_analyzer_json(self):
        """将DrawDown分析器结果组装成JSON数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取DrawDown分析器结果
        drawdown_analyzer = self.results[0].analyzers.drawdown_analyzer.get_analysis()
        
        return json.dumps(drawdown_analyzer, indent=2, default=str)
    
    def print_sqn_analyzer(self):   #接入真实数据后，在分析这数据打印的是否正确
        """打印SQN分析器详细结果"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取SQN分析器结果
        sqn_analyzer = self.results[0].analyzers.sqn_analyzer.get_analysis()
        
        print("\n===== SQN分析器详细结果 =====")
        
        # 打印所有SQN数据
        print(f"  SQN值: {sqn_analyzer.get('sqn', 0.0):.6f}")
        print(f"  交易笔数: {sqn_analyzer.get('trades', 0) if 'trades' in sqn_analyzer else sqn_analyzer.get('tradecount', 0)}")
        
        # 打印盈利和亏损交易数
        won = sqn_analyzer.get('won', 0)
        lost = sqn_analyzer.get('lost', 0)
        print(f"  盈利交易: {won} 笔")
        print(f"  亏损交易: {lost} 笔")
        
        # 打印盈亏统计
        if 'pnl' in sqn_analyzer:
            pnl = sqn_analyzer['pnl']
            print(f"\n  盈亏统计:")
            print(f"    平均盈亏: {pnl.get('average', 0.0):.2f}")
            print(f"    盈亏标准差: {pnl.get('stddev', 0.0):.2f}")
        
        # 打印盈利交易盈亏统计
        if 'pnlplus' in sqn_analyzer:
            pnlplus = sqn_analyzer['pnlplus']
            print(f"\n  盈利交易盈亏统计:")
            print(f"    平均盈利: {pnlplus.get('average', 0.0):.2f}")
            print(f"    盈利标准差: {pnlplus.get('stddev', 0.0):.2f}")
        
        # 打印亏损交易盈亏统计
        if 'pnlminus' in sqn_analyzer:
            pnlminus = sqn_analyzer['pnlminus']
            print(f"\n  亏损交易盈亏统计:")
            print(f"    平均亏损: {pnlminus.get('average', 0.0):.2f}")
            print(f"    亏损标准差: {pnlminus.get('stddev', 0.0):.2f}")
        
        # 打印所有原始字段（用于调试）
        print(f"\n  所有原始字段:")
        for key, value in sqn_analyzer.items():
            if isinstance(value, dict):
                print(f"    {key}:")
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, float):
                        print(f"      {sub_key}: {sub_value:.6f}")
                    else:
                        print(f"      {sub_key}: {sub_value}")
            else:
                if isinstance(value, float):
                    print(f"    {key}: {value:.6f}")
                else:
                    print(f"    {key}: {value}")
    
    def get_sqn_analyzer_json(self):
        """将SQN分析器结果组装成JSON数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取SQN分析器结果
        sqn_analyzer = self.results[0].analyzers.sqn_analyzer.get_analysis()
        
        return json.dumps(sqn_analyzer, indent=2, default=str)
    
    def print_returns_analyzer(self):
        """打印Returns分析器结果"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取Returns分析器结果
        returns_analyzer = self.results[0].analyzers.returns_analyzer.get_analysis()
        
        print("\n===== Returns分析器详细结果 =====")
        
        # 打印所有Returns数据
        for key, value in returns_analyzer.items():
            if isinstance(value, float):
                print(f"  {key}: {value:.6f}")
            else:
                print(f"  {key}: {value}")
    
    def get_returns_analyzer_json(self):
        """将Returns分析器结果组装成JSON数据"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        # 获取Returns分析器结果
        returns_analyzer = self.results[0].analyzers.returns_analyzer.get_analysis()
        
        return json.dumps(returns_analyzer, indent=2, default=str)
    
    def print_all_analysis_json(self):
        """将所有分析结果拼装成一个大的JSON并打印，包含策略类型标识"""
        if not hasattr(self, 'results'):
            raise ValueError("请先调用run()方法")
        
        print("\n===== 所有分析结果拼装成大JSON =====")
        
        # 获取所有分析结果
        analyzer_json = json.loads(self.get_analyzer_results_json())
        trade_json = json.loads(self.get_trade_analyzer_json())
        drawdown_json = json.loads(self.get_drawdown_analyzer_json())
        sqn_json = json.loads(self.get_sqn_analyzer_json())
        returns_json = json.loads(self.get_returns_analyzer_json())
        
        # 拼装成一个大的JSON
        all_analysis = {
            'strategy_type': 'backtrader',  # 策略类型标识
            'data':{
                'return_analyzer': analyzer_json,
                'trade_analyzer': trade_json,
                'drawdown_analyzer': drawdown_json,
                'sqn_analyzer': sqn_json,
                'returns_analyzer': returns_json
            }
        }
        
        # 打印大JSON
        print("\n\ndata\n\n")
        print(json.dumps(all_analysis, indent=2, default=str))
        json.dump(all_analysis, open('all_analysis.json', 'w'), indent=2, default=str)
        print("\n\ndone\n\n")

class BullishRetracementStrategy(bt.Strategy):
    params = (
        ('short_period', 5),
        ('medium_period', 10),
        ('long_period', 20),
        ('longer_period', 40),
        ('longest_period', 120),
        ('exit_period1', 5),
        ('exit_period2', 60),
        ('max_stocks', 10),
        # 波动率止损参数
        ('atr_period', 14),  # ATR计算周期
        ('atr_multiplier', 2.0),  # 止损倍数
    )

    def __init__(self):
        self.sold = False
        self.bought = {}
        self.signal_count = 0
        self.stock_signals = {}
        self.ma = {}
        self.entry_prices = {}  # 记录每只股票的买入价格
        self.trades = []  # 初始化交易列表，用于存储交易对象
        
        # 初始化每只股票的均线
        for data in self.datas:
            self.ma[data._name] = {
                'short': bt.indicators.SimpleMovingAverage(data.close, period=self.params.short_period),
                'medium': bt.indicators.SimpleMovingAverage(data.close, period=self.params.medium_period),
                'long': bt.indicators.SimpleMovingAverage(data.close, period=self.params.long_period),
                'longer': bt.indicators.SimpleMovingAverage(data.close, period=self.params.longer_period),
                'longest': bt.indicators.SimpleMovingAverage(data.close, period=self.params.longest_period),
            }
            self.bought[data._name] = False
            self.stock_signals[data._name] = False
            self.entry_prices[data._name] = None
        
        # 用于卖出信号的均线
        self.exit_ma = {}
        for data in self.datas:
            self.exit_ma[data._name] = {
                'short': bt.indicators.SimpleMovingAverage(data.close, period=self.params.exit_period1),
                'long': bt.indicators.SimpleMovingAverage(data.close, period=self.params.exit_period2),
            }
            # 金叉死叉信号
            self.exit_ma[data._name]['cross'] = bt.indicators.CrossOver(
                self.exit_ma[data._name]['short'], 
                self.exit_ma[data._name]['long']
            )
        
        # 初始化ATR指标用于波动率止损
        self.atr = {}
        for data in self.datas:
            self.atr[data._name] = bt.indicators.ATR(data, period=self.params.atr_period)
    
    def calculate_buy_size(self, price, total_amount):
        """
        计算买入数量，考虑买入费用
        
        参数：
        price: 买入价格
        total_amount: 计划买入的总金额（包含费用）
        
        返回：
        int: 实际可以买入的数量
        """
        # 获取佣金率
        commission_rate = self.broker.comminfo[None].p.commission
        
        # 计算公式：数量 = 总金额 / (价格 * (1 + 佣金率))
        # 因为：总金额 = 数量 * 价格 + 数量 * 价格 * 佣金率 = 数量 * 价格 * (1 + 佣金率)
        # 所以：数量 = 总金额 / (价格 * (1 + 佣金率))
        
        # 计算可以买入的数量（向下取整，因为股票数量必须是整数）
        buy_size = int(total_amount / (price * (1 + commission_rate)))
        
        return buy_size
    
    def buy(self, **kwargs):
        """自定义buy方法，打印订单信息"""
        # 获取股票数据和数量
        data = kwargs.get('data', self.datas[0])
        size = kwargs.get('size', 0)
        
        # 检查数量是否为0
        if size <= 0:
            # 获取当前bar时间
            current_time = data.datetime.datetime(0)
            print(f"\n【买入】时间: {current_time} | 股票: {data._name}, 数量: {size}, 数量无效，取消下单")
            return None
        
        # 获取当前bar时间
        current_time = data.datetime.datetime(0)
        
        # 获取下单前的余额和总资产
        pre_cash = self.broker.getcash()
        pre_value = self.broker.getvalue()
        
        price = data.close[0]  # 使用收盘价
        
        # 计算预计交易金额
        expected_cost = size * price
        
        # 调用父类的buy方法执行下单
        order = super().buy(**kwargs)
        
        # 获取下单后的余额和总资产
        post_cash = self.broker.getcash()
        post_value = self.broker.getvalue()
        
        # 检查订单是否成功创建
        if order:
            order_status = order.getstatusname()
            order_info = f"订单ID: {order.ref}, 状态: {order_status}"
            
            # 检查订单是否被拒绝
            if order_status == 'Rejected':
                # 获取拒绝信息
                rejection_info = getattr(order, 'reject_info', '未知原因')
                rejection_reason = getattr(order, 'reject_reason', '无详细原因')
                order_info += f" | 拒绝信息: {rejection_info} | 拒绝原因: {rejection_reason}"
        else:
            order_info = "订单创建失败"
        
        # 单行打印所有信息，包含当前bar时间
        print(f"\n【买入】时间: {current_time} | 股票: {data._name} | 数量: {size} | 价格: {price:.2f} | 预计成本: {expected_cost:.2f} | 前余额: {pre_cash:.2f} | 前总资产: {pre_value:.2f} | 后余额: {post_cash:.2f} | 后总资产: {post_value:.2f} | {order_info}")
        
        return order
    
    def sell(self, **kwargs):
        """自定义sell方法，打印订单信息"""
        # 获取股票数据和数量
        data = kwargs.get('data', self.datas[0])
        size = kwargs.get('size', 0)
        
        # 检查数量是否为0
        if size <= 0:
            # 获取当前bar时间
            current_time = data.datetime.datetime(0)
            print(f"\n【卖出】时间: {current_time} | 股票: {data._name}, 数量: {size}, 数量无效，取消下单")
            return None
        
        # 获取当前bar时间
        current_time = data.datetime.datetime(0)
        
        # 获取下单前的余额和总资产
        pre_cash = self.broker.getcash()
        pre_value = self.broker.getvalue()
        
        price = data.close[0]  # 使用收盘价
        
        # 计算预计交易金额
        expected_revenue = size * price
        
        # 调用父类的sell方法执行下单
        order = super().sell(**kwargs)
        
        # 获取下单后的余额和总资产
        post_cash = self.broker.getcash()
        post_value = self.broker.getvalue()
        
        # 检查订单是否成功创建
        if order:
            order_status = order.getstatusname()
            order_info = f"订单ID: {order.ref}, 状态: {order_status}"
            
            # 检查订单是否被拒绝
            if order_status == 'Rejected':
                # 获取拒绝信息
                rejection_info = getattr(order, 'reject_info', '未知原因')
                rejection_reason = getattr(order, 'reject_reason', '无详细原因')
                order_info += f" | 拒绝信息: {rejection_info} | 拒绝原因: {rejection_reason}"
        else:
            order_info = "订单创建失败"
        
        # 单行打印所有信息，包含当前bar时间
        print(f"\n【卖出】时间: {current_time} | 股票: {data._name} | 数量: {size} | 价格: {price:.2f} | 预计收入: {expected_revenue:.2f} | 前余额: {pre_cash:.2f} | 前总资产: {pre_value:.2f} | 后余额: {post_cash:.2f} | 后总资产: {post_value:.2f} | {order_info}")
        
        return order

    def next(self):
        # 检查卖出信号
        for data in self.datas:
            if self.bought[data._name]:
                # 1. 5日均线下穿60日均线，第二天开盘卖出
                if self.exit_ma[data._name]['cross'][0] == -1:  # 死叉
                    self.sell(data=data, size=self.getposition(data).size, exectype=bt.Order.Market)
                    self.bought[data._name] = False
                    self.signal_count -= 1
                    print(f"卖出信号: {data._name} 5日均线下穿60日均线")
                # 2. 波动率止损：当前价格低于买入价格减去ATR*止损倍数
                elif self.entry_prices[data._name] is not None:
                    stop_loss_price = self.entry_prices[data._name] - (self.atr[data._name][0] * self.params.atr_multiplier)
                    if data.low[0] < stop_loss_price:  # 价格触及止损线
                        self.sell(data=data, size=self.getposition(data).size, exectype=bt.Order.Market)
                        self.bought[data._name] = False
                        self.signal_count -= 1
                        print(f"波动率止损: {data._name} 价格触及止损线 {stop_loss_price:.2f}")

        # 检查买入信号
        new_signals = []
        for data in self.datas:
            if not self.bought[data._name]:
                # 检查多头排列：短期均线依次大于长期均线
                ma = self.ma[data._name]
                if (ma['short'][0] > ma['medium'][0] > ma['long'][0] > ma['longer'][0] > ma['longest'][0]):
                    # 回踩点：当根K线击穿10日均线，未击穿更长周期均线
                    if (data.low[0] < ma['medium'][0] and 
                        data.low[0] > ma['long'][0] and 
                        data.low[0] > ma['longer'][0] and 
                        data.low[0] > ma['longest'][0]):
                        self.stock_signals[data._name] = True
                        new_signals.append(data._name)

        # 处理新信号
        if new_signals:
            # 1. 计算现有持仓数量
            current_positions = sum(1 for data in self.datas if self.bought[data._name])
            
            # 2. 计算可买入的新标的数量（不超过最大持仓限制）
            available_slots = self.params.max_stocks - current_positions
            new_stocks_to_buy = min(len(new_signals), available_slots)
            
            # 3. 计算总持仓数量
            total_positions = current_positions + new_stocks_to_buy
            
            # 4. 更新信号计数
            self.signal_count = total_positions
            
            # 5. 计算每只股票的目标权重
            if total_positions > 0:
                target_weight = 1.0 / total_positions
            else:
                target_weight = 0

            # 6. 动态再平衡 - 第一步：统计需要卖出的股票和需要买入的股票
            total_value = self.broker.getvalue()
            cash = self.broker.getcash()
            
            # 获取佣金率
            commission_rate = self.broker.comminfo[None].p.commission
            
            # 统计需要卖出的股票和卖出数量
            sell_orders = []
            
            # 计算每只现有持仓的目标价值和需要卖出的数量
            existing_stocks = [data for data in self.datas if self.bought[data._name]]
            
            for data in existing_stocks:
                current_value = self.getposition(data).size * data.close[0]
                current_weight = current_value / total_value
                
                if current_weight > target_weight:
                    # 需要卖出股票
                    target_value = total_value * target_weight
                    value_diff = target_value - current_value
                    
                    if value_diff < 0:
                        # 实际到账金额 = 卖出金额 * (1 - 佣金率)
                        # 所以需要卖出的金额 = 调整金额 / (1 - 佣金率)
                        adjusted_sell_amount = abs(value_diff) / (1 - commission_rate)
                        sell_size = int(adjusted_sell_amount / data.close[0])
                        
                        if sell_size > 0:
                            sell_orders.append((data, sell_size))
            
            # 统计需要买入的股票
            buy_stocks = []
            bought_new_stocks = 0
            for stock_name in new_signals:
                if bought_new_stocks >= new_stocks_to_buy:
                    break
                    
                data = next(d for d in self.datas if d._name == stock_name)
                if total_positions <= self.params.max_stocks:
                    buy_stocks.append(data)
                    bought_new_stocks += 1
            
            # 7. 执行第一步：卖出所有需要卖出的股票
            for data, sell_size in sell_orders:
                self.sell(data=data, size=sell_size, exectype=bt.Order.Market)
                print(f"再平衡卖出: {data._name} 卖出 {sell_size} 股，价格 {data.close[0]:.2f}")
            
            # 8. 重新计算总价值和现金（因为已经卖出了部分股票）
            total_value = self.broker.getvalue()
            cash = self.broker.getcash()
            
            # 9. 执行第二步：买入需要买入的股票
            # 计算每只股票的买入金额
            total_buy_stocks = len(buy_stocks) + len(existing_stocks)
            if total_buy_stocks > 0:
                target_weight = 1.0 / total_buy_stocks
            else:
                target_weight = 0
            
            # 计算总可用资金用于买入
            available_cash = cash
            
            # 计算每只股票的买入金额
            if len(buy_stocks) > 0:
                buy_amount_per_stock = available_cash / len(buy_stocks)
            else:
                buy_amount_per_stock = 0
            
            # 买入新标的
            for data in buy_stocks:
                # 考虑买入费率，实际可用金额 = 计划买入金额 / (1 + 佣金率)
                adjusted_buy_amount = buy_amount_per_stock / (1 + commission_rate)
                buy_size = self.calculate_buy_size(data.close[0], adjusted_buy_amount)
                
                if buy_size > 0:
                    self.buy(data=data, size=buy_size, exectype=bt.Order.Market)
                    self.bought[data._name] = True
                    # 记录买入价格，用于波动率止损
                    self.entry_prices[data._name] = data.close[0]
                    print(f"买入信号: {data._name} 多头回踩，买入 {buy_size} 股，买入价格 {data.close[0]:.2f}")
            
            # 11. 动态再平衡完成：每只股票的资金占总资金的百分比已按目标权重分配

    def notify_order(self, order):
        if order.status == order.Completed:
            if order.issell():
                self.sold = True

    def notify_trade(self, trade):
        """处理交易通知，确保TradeAnalyzer能够获取交易信息"""
        # 这个方法会被cerebro调用，当交易完成时
        # TradeAnalyzer会通过这个方法获取交易信息
        pass

    def stop(self):
        """回测结束时强制平仓"""
        for data in self.datas:
            position = self.getposition(data)
            if position.size > 0:
                print(f"回测结束，强制平仓 {data._name}：持仓数量 {position.size}")
                self.close(data=data)

def create_simulation_data(symbol, start_date='2024-01-01', end_date='2025-10-30'):
    """
    从CSV文件读取股票数据，只使用后复权(hfq)数据
    """
    # 构建文件路径
    file_path = f'D:\\work\\2025-11-20\\{symbol}.csv'
    
    # 读取CSV文件
    df = pd.read_csv(file_path)
    
    # 筛选后复权(hfq)数据
    df = df[df['adjust_type'] == 'hfq']
    
    # 将trade_date列转换为datetime类型
    df['trade_date'] = pd.to_datetime(df['trade_date'])
    df.set_index('trade_date', inplace=True)
    
    # 筛选日期范围
    df = df[(df.index >= start_date) & (df.index <= end_date)]
    
    # 重命名列以匹配backtrader的预期
    df = df.rename(columns={
        'open': 'open',
        'high': 'high',
        'low': 'low',
        'close': 'close',
        'volume': 'volume'
    })
    
    # 确保包含所需列
    if 'volume' not in df.columns:
        df['volume'] = 0
    if 'openinterest' not in df.columns:
        df['openinterest'] = 0
    
    return bt.feeds.PandasData(dataname=df, name=symbol)

# 主函数
def main():
    # 创建自定义Cerebro实例
    cerebro = MyCerebro()
    
    # 设置自定义broker，确保订单立即成交
    custom_broker = ImmediateExecutionBroker()
    
    cerebro.setbroker(custom_broker)
    
    # 硬编码10个股票名称（从D:\work\2025-11-20目录随机选择）
    stock_symbols = [
        '605268', '605277', '605286', '605287', '605288',
        '605289', '605296', '605298', '605299', '605300'
    ]
    
    # 添加10只股票的模拟数据
    for symbol in stock_symbols:
        cerebro.adddata(create_simulation_data(symbol))
    
    # 添加策略
    cerebro.addstrategy(BullishRetracementStrategy)
    
    # 设置初始资金
    cerebro.broker.setcash(1000000.0)
    
    # 设置佣金
    cerebro.broker.setcommission(commission=0.001)
    
    # 运行策略
    print("初始资金: %.2f" % cerebro.broker.getvalue())
    results = cerebro.run()
    
    print("最终资金: %.2f" % cerebro.broker.getvalue())
    
    
if __name__ == '__main__':
    main()
# 缩进已修正，无需改动实际代码逻辑，仅保持原有缩进一致_ == '__main__':