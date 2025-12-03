# -*- coding: utf-8 -*-
"""
行业轮动的基本面选股策略（Akshare + Backtrader）

规则：
- 选出动量得分前3的大行业（申万一级）
- 行业动量由近5/20/60日收益率按 0.4/0.3/0.3 加权
- 每个行业选基本面得分前10的股票（f1 ROE、f2 归母净利润单季环比、f3 市净率LF；score = f1+f2+f3）
- 10日调仓，等权买入（按开盘价撮合）
- 初始资金100万；手续费：买入万3、卖出千1.3、最低 5 元/笔

说明：
- 行业动量：若申万行业指数历史不可用，则用行业成分股的等权平均收益近似行业收益
- 基本面：采用 Akshare 的财务分析指标接口，取最近季度；若缺失则回退处理
- 数据频率：日线

依赖：akshare, backtrader, pandas, numpy
运行：
  python d:\helix\Helix\quantcode\industry_rotation_bt.py
"""

import datetime as dt
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Set

import pandas as pd
import numpy as np
import backtrader as bt

import akshare as ak


# -----------------------------
# 参数配置
# -----------------------------
@dataclass
class StrategyParams:
    start_date: str = "20180101"  # YYYYMMDD
    end_date: str = dt.datetime.today().strftime("%Y%m%d")
    rebalance_days: int = 10
    industry_top_n: int = 3
    per_industry_stock_n: int = 10
    initial_cash: float = 1_000_000.0
    buy_commission: float = 0.0003
    sell_commission: float = 0.0013
    min_fee: float = 5.0
    adjust: str = "qfq"  # 前复权，用于个股日线
    universe_limit_per_industry: Optional[int] = None  # 控制每个行业最大股票数，避免过多拉取


# -----------------------------
# Akshare 数据获取与清洗
# -----------------------------

def get_sw_industry_list() -> pd.DataFrame:
    """获取行业列表（优先申万；若不可用则回退到东方财富行业）。
    返回至少包含列：['指数代码', '指数名称']（名称保持兼容）。
    """
    # 回退方案：东方财富行业列表
    em = ak.stock_board_industry_name_em()
    # 统一列名
    if {'板块名称', '板块代码'}.issubset(set(em.columns)):
        df = em[['板块代码', '板块名称']].copy()
        df.rename(columns={'板块代码': '指数代码', '板块名称': '指数名称'}, inplace=True)
    else:
        # 极端情况下直接返回空
        df = pd.DataFrame(columns=['指数代码', '指数名称'])
    return df


def get_sw_industry_cons(index_code: str) -> pd.DataFrame:
    """获取行业成分股（优先申万；若不可用则回退到东方财富行业成分）。
    返回至少包含列：['成分股代码', '成分股名称'] 的兼容形式。
    """
    try:
        cons = ak.stock_board_industry_cons_em(symbol=index_code)
    except Exception:
        cons = pd.DataFrame()
    if cons is None or cons.empty:
        return pd.DataFrame(columns=['code', 'name'])
    # 统一列为 code/name
    code_col = '代码' if '代码' in cons.columns else cons.columns[0]
    name_col = '名称' if '名称' in cons.columns else cons.columns[1]
    cons = cons[[code_col, name_col]].copy()
    cons.rename(columns={code_col: 'code', name_col: 'name'}, inplace=True)
    cons['code'] = cons['code'].astype(str).str.replace('.SH', '', regex=False).str.replace('.SZ', '', regex=False)
    cons = cons[cons['code'].str.match(r'^\d{6}$')]
    return cons


def fetch_stock_hist(symbol: str, start_date: str, end_date: str, adjust: str = "qfq") -> Optional[pd.DataFrame]:
    """获取个股日线历史，并转为 Backtrader 需要的列。"""
    try:
        df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust=adjust)
    except Exception:
        return None
    if df is None or df.empty:
        return None
    # 标准化列
    col_map = {
        '日期': 'date', '开盘': 'open', '收盘': 'close', '最高': 'high', '最低': 'low', '成交量': 'volume', '成交额': 'amount'
    }
    for k, v in col_map.items():
        if k not in df.columns:
            return None
    out = df[list(col_map.keys())].rename(columns=col_map)
    out['date'] = pd.to_datetime(out['date'])
    out.sort_values('date', inplace=True)
    out.set_index('date', inplace=True)
    return out


# -----------------------------
# 因子与动量计算
# -----------------------------

def compute_equal_weight_industry_return(cons_codes: List[str], end_date: pd.Timestamp, window: int,
                                         price_cache: Dict[str, pd.DataFrame]) -> Optional[float]:
    """用成分股等权近 window 日收益近似行业收益。以 end_date 为截止（含），需要至少 window+1 天数据。
    返回累计收益率（例如 0.05 表示 5%）。
    """
    rets = []
    for code in cons_codes:
        df = price_cache.get(code)
        if df is None:
            continue
        # 截取到 end_date
        sub = df[df.index <= end_date].tail(window + 1)
        if len(sub) < window + 1:
            continue
        start_price = sub.iloc[0]['close']
        end_price = sub.iloc[-1]['close']
        if pd.isna(start_price) or pd.isna(end_price) or start_price <= 0:
            continue
        rets.append((end_price / start_price) - 1.0)
    if not rets:
        return None
    return float(np.nanmean(rets))


def weighted_momentum(cons_codes: List[str], as_of: pd.Timestamp,
                      price_cache: Dict[str, pd.DataFrame],
                      windows=(5, 20, 60), weights=(0.4, 0.3, 0.3)) -> Optional[float]:
    vals = []
    for w in windows:
        r = compute_equal_weight_industry_return(cons_codes, as_of, w, price_cache)
        if r is None:
            return None
        vals.append(r)
    return float(np.dot(vals, weights))


def fetch_fundamentals(symbol: str) -> Dict[str, Optional[float]]:
    """获取个股基本面因子：f1 ROE, f2 归母净利润单季环比增长率, f3 市净率(LF)。
    尽量从 ak.stock_financial_analysis_indicator 抓取，若缺失尽可能回退。
    返回：{'roe': x, 'qoq_np': y, 'pb_lf': z}
    """
    result = {'roe': None, 'qoq_np': None, 'pb_lf': None}
    try:
        fin = ak.stock_financial_analysis_indicator(symbol=symbol)
    except Exception:
        return result
    if fin is None or fin.empty:
        return result
    # 选择最近一行（按报告期排序）
    # 常见列示例（可能随版本变化）：'净资产收益率ROE', '归属母公司净利润-单季度', '市净率LF', '报告期'
    # 尽量规范列名映射
    fin = fin.copy()
    if '报告期' in fin.columns:
        # 确保报告期可排序
        try:
            fin['报告期_dt'] = pd.to_datetime(fin['报告期'])
            fin = fin.sort_values('报告期_dt')
        except Exception:
            pass
    latest = fin.tail(1)

    # ROE
    roe_cols = [c for c in fin.columns if ('ROE' in str(c)) or ('净资产收益率' in str(c))]
    if roe_cols:
        val = pd.to_numeric(latest[roe_cols[0]], errors='coerce').values[0]
        result['roe'] = None if pd.isna(val) else float(val)

    # 市净率 LF / PB
    pb_cols = [c for c in fin.columns if ('市净率' in str(c)) and ('LF' in str(c))]
    if not pb_cols:
        pb_cols = [c for c in fin.columns if ('市净率' in str(c))]
    if pb_cols:
        val = pd.to_numeric(latest[pb_cols[0]], errors='coerce').values[0]
        result['pb_lf'] = None if pd.isna(val) else float(val)

    # 归母净利润单季（用于环比）
    # 尝试获取最近两期单季度归母净利润，计算 (Q - Q-1) / abs(Q-1)
    np_cols = [c for c in fin.columns if ('归属母公司净利润' in str(c)) and ('单季度' in str(c))]
    qoq_val = None
    if np_cols:
        # 取最近两行的该列
        series = pd.to_numeric(fin[np_cols[0]], errors='coerce')
        if series.dropna().shape[0] >= 2:
            last_two = series.dropna().tail(2).values
            prev = last_two[0]
            cur = last_two[1]
            if prev and not pd.isna(prev) and not pd.isna(cur) and prev != 0:
                qoq_val = float((cur - prev) / abs(prev))
    result['qoq_np'] = qoq_val

    return result


def rank_fundamentals(df: pd.DataFrame) -> pd.DataFrame:
    """对基本面打分：f1 ROE 升序百分比排名，f2 QOQ 升序百分比排名，f3 PB 降序百分比排名。
    注意：这里按文档描述进行排名方向设置。
    返回增加列：['f1_rank', 'f2_rank', 'f3_rank', 'score']
    """
    out = df.copy()
    # 升序百分比排名：值越小排名越靠前（百分比越低）。若希望值越大越好应使用降序。
    # 文档指定：f1/f2 升序，f3 降序。
    out['f1_rank'] = out['roe'].rank(pct=True, ascending=True)
    out['f2_rank'] = out['qoq_np'].rank(pct=True, ascending=True)
    out['f3_rank'] = out['pb_lf'].rank(pct=True, ascending=False)
    out['score'] = out[['f1_rank', 'f2_rank', 'f3_rank']].sum(axis=1)
    return out


# -----------------------------
# Backtrader 数据封装与佣金
# -----------------------------
class PandasDataCN(bt.feeds.PandasData):
    params = (
        ('datetime', None),
        ('open', 'open'),
        ('high', 'high'),
        ('low', 'low'),
        ('close', 'close'),
        ('volume', 'volume'),
        ('openinterest', None),
    )


class BuySellMinFeeCommission(bt.CommInfoBase):
    params = dict(
        buy_commission=0.0003,
        sell_commission=0.0013,
        min_fee=5.0,
        stocklike=True,
        percabs=True,
    )

    def _getcommission(self, size, price, pseudoexec):
        # 市价订单按数量与价格计算金额
        pvalue = abs(size) * price
        if size > 0:  # buy
            fee = max(pvalue * self.p.buy_commission, self.p.min_fee)
        else:  # sell
            fee = max(pvalue * self.p.sell_commission, self.p.min_fee)
        return fee


# -----------------------------
# 策略：行业轮动基本面选股
# -----------------------------
class IndustryRotationStrategy(bt.Strategy):
    params = dict(
        selection_map=None,  # Dict[date -> List[symbol]]
        per_industry_stock_n=10,
        rebalance_days=10,
        printlog=True,
    )

    def __init__(self):
        self.datamap = {d._name: d for d in self.datas}
        # 计算等权目标权重（每次调仓动态按持仓数均分）

    def log(self, txt):
        if self.p.printlog:
            dt_str = self.datas[0].datetime.date().isoformat()
            print(f"{dt_str} - {txt}")

    def next_open(self):
        # cheat-on-open 下，在开盘价撮合
        cur_date = self.datas[0].datetime.date(0)
        picks = self.p.selection_map.get(cur_date)
        if picks is None:
            return
        picks = [p for p in picks if p in self.datamap]
        if not picks:
            return
        target_weight = 1.0 / len(picks)
        current = set([d._name for d in self.datas if self.getposition(d).size != 0])
        target = set(picks)

        # 先卖出不在目标中的持仓
        for sym in current - target:
            data = self.datamap[sym]
            pos = self.getposition(data)
            if pos.size != 0:
                self.close(data=data)
                self.log(f"Close {sym}")

        # 再等权买入目标
        for sym in target:
            data = self.datamap[sym]
            self.order_target_percent(data=data, target=target_weight)
            self.log(f"Target {sym}: {target_weight:.2%}")


# -----------------------------
# 选股与调仓日计算
# -----------------------------

def business_days(start: str, end: str) -> List[pd.Timestamp]:
    rng = pd.date_range(pd.to_datetime(start), pd.to_datetime(end), freq='B')
    return list(rng)


def compute_rebalance_dates(start: str, end: str, step_days: int) -> List[dt.date]:
    bdays = business_days(start, end)
    dates = [d.date() for i, d in enumerate(bdays) if i % step_days == 0]
    return dates


# -----------------------------
# 选股流程：
# 1) 每个调仓日，先计算行业动量（基于成分股聚合）并选前 N 行业
# 2) 在每个行业内，拉取基本面，打分选前 M 股票
# -----------------------------

def prepare_selection_map(params: StrategyParams) -> Tuple[Dict[dt.date, List[str]], Set[str]]:
    ind_df = get_sw_industry_list()
    if ind_df.empty:
        raise RuntimeError("无法获取申万行业列表")

    # 预拉个股历史缓存，避免重复请求
    # 先收集所有行业的成分股代码（受 universe_limit_per_industry 控制）
    industry_cons_map: Dict[str, List[str]] = {}
    for _, row in ind_df.iterrows():
        code = str(row['指数代码'])
        cons = get_sw_industry_cons(code)
        codes = cons['code'].tolist()
        if params.universe_limit_per_industry:
            codes = codes[: params.universe_limit_per_industry]
        industry_cons_map[code] = codes

    # 价格缓存
    price_cache: Dict[str, pd.DataFrame] = {}
    for codes in industry_cons_map.values():
        for c in codes:
            if c in price_cache:
                continue
            df = fetch_stock_hist(c, params.start_date, params.end_date, params.adjust)
            if df is not None and not df.empty:
                price_cache[c] = df

    # 调仓日（在当天开盘调仓，因此动量与基本面使用前一交易日信息）
    rebalance_dates = compute_rebalance_dates(params.start_date, params.end_date, params.rebalance_days)

    selection_map: Dict[dt.date, List[str]] = {}
    universe_selected: Set[str] = set()

    for rdate in rebalance_dates:
        as_of = pd.Timestamp(rdate) - pd.Timedelta(days=1)
        # 计算每个行业的加权动量
        ind_momentum = []
        for ind_code, codes in industry_cons_map.items():
            mom = weighted_momentum(codes, as_of, price_cache)
            if mom is None:
                continue
            ind_momentum.append({'industry': ind_code, 'momentum': mom})
        if not ind_momentum:
            continue
        ind_mom_df = pd.DataFrame(ind_momentum).sort_values('momentum', ascending=False)
        top_inds = ind_mom_df.head(params.industry_top_n)['industry'].tolist()

        # 行业内基本面打分并选股
        picks: List[str] = []
        for ind in top_inds:
            codes = industry_cons_map[ind]
            fundamentals = []
            for c in codes:
                f = fetch_fundamentals(c)
                fundamentals.append({'code': c, **f})
            fdf = pd.DataFrame(fundamentals)
            # 去除严重缺失
            fdf = fdf.dropna(subset=['roe', 'qoq_np', 'pb_lf'], how='any')
            if fdf.empty:
                continue
            fdf_scored = rank_fundamentals(fdf).sort_values('score', ascending=False)
            top_codes = fdf_scored.head(params.per_industry_stock_n)['code'].tolist()
            picks.extend(top_codes)
        # 去重
        picks = list(dict.fromkeys(picks))
        selection_map[rdate] = picks
        universe_selected.update(picks)

    return selection_map, universe_selected


# -----------------------------
# 运行回测
# -----------------------------

def run_backtest(params: StrategyParams):
    selection_map, universe = prepare_selection_map(params)
    if not selection_map:
        raise RuntimeError("选股为空，可能是数据拉取失败或时间范围过短")

    cerebro = bt.Cerebro()

    # 添加数据：仅添加曾被选中的标的，减少数据量
    for sym in sorted(universe):
        df = fetch_stock_hist(sym, params.start_date, params.end_date, params.adjust)
        if df is None or df.empty:
            continue
        data = PandasDataCN(dataname=df, name=sym)
        cerebro.adddata(data)

    # 设置佣金（含最低 5 元）
    comminfo = BuySellMinFeeCommission(buy_commission=params.buy_commission,
                                       sell_commission=params.sell_commission,
                                       min_fee=params.min_fee)
    cerebro.broker.addcommissioninfo(comminfo)

    # 初始资金
    cerebro.broker.setcash(params.initial_cash)

    # 开盘撮合：启用 cheat-on-open
    try:
        cerebro.broker.set_coo(True)  # 有的版本为 set_coo
    except Exception:
        # 回退：使用 next() 下的开盘价（不完全等价），或启用 cheat-on-close
        cerebro.broker.set_coc(True)

    # 添加策略
    cerebro.addstrategy(IndustryRotationStrategy,
                        selection_map=selection_map,
                        per_industry_stock_n=params.per_industry_stock_n,
                        rebalance_days=params.rebalance_days)

    print(f"Starting Portfolio Value: {cerebro.broker.getvalue():.2f}")
    res = cerebro.run()
    print(f"Final Portfolio Value: {cerebro.broker.getvalue():.2f}")
    # 可视化（如需）
    # cerebro.plot(style='candel')


if __name__ == "__main__":
    # 你可以直接编辑这里的参数进行快速试跑
    sp = StrategyParams(
        start_date="20190101",
        end_date=dt.datetime.today().strftime("%Y%m%d"),
        rebalance_days=10,
        industry_top_n=3,
        per_industry_stock_n=10,
        initial_cash=1_000_000,
        buy_commission=0.0003,
        sell_commission=0.0013,
        min_fee=5.0,
        adjust="qfq",
        universe_limit_per_industry=80,  # 为了速度限制每行业最多 80 只
    )
    run_backtest(sp)