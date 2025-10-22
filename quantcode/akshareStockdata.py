import datetime
import akshare as ak
from pymongo import MongoClient
import pandas as pd

def get_astock_by_akshare():
    """使用AkShare获取A股数据"""
    client = MongoClient('mongodb://localhost:27017/')
    collection = client['astock_database']['companies']
    
    # 获取A股基本信息
    stock_info_a_code_name_df = ak.stock_info_a_code_name()
    
    for index, row in stock_info_a_code_name_df.iterrows():
        try:
            code = row['code']
            name = row['name']
            
            # 判断交易所
            if code.startswith('6'):
                exchange = 'SH'
                ts_code = f"{code}.SH"
            elif code.startswith('0') or code.startswith('3'):
                exchange = 'SZ' 
                ts_code = f"{code}.SZ"
            else:
                exchange = 'BJ'
                ts_code = f"{code}.BJ"
            
            # 获取公司详情
            stock_individual_info_em_df = ak.stock_individual_info_em(symbol=code)
            
            document = {
                'ts_code': ts_code,
                'symbol': code,
                'exchange': exchange,
                'name': name,
                'fullname': name,
                'area': '',
                'industry': '',
                'market': '主板' if code.startswith('6') else '创业板',
                'listing_date': '',
                'status': '正常上市',
                'is_hs': 'S' if exchange == 'SZ' else 'H',
                
                'company_info': {
                    'legal_representative': '',
                    'registration_capital': 0,
                    'phone': '',
                    'website': '',
                    'office': '',
                    'profile': '',
                    'employees': 0
                },
                
                'financial_snapshot': {
                    'total_mv': 0,
                    'float_mv': 0,
                    'pe_ttm': 0,
                    'pb': 0,
                    'dividend_yield': 0
                },
                
                'created_at': str(datetime),
                'updated_at': str(datetime)
            }
            
            collection.update_one(
                {'ts_code': document['ts_code']},
                {'$set': document},
                upsert=True
            )
            
            print(f"已处理: {name} ({code})")
            
        except Exception as e:
            print(f"处理 {code} 时出错: {str(e)}")
            continue
        
get_astock_by_akshare()