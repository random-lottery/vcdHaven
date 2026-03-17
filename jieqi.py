import json
from datetime import datetime as date

# 原始字符串
data_str = '\n\n立春02月04日雨水02月18日惊蛰03月05日春分03月20日清明04月05日谷雨04月20日\n\n立夏05月05日小满05月21日芒种06月05日夏至06月21日小暑07月07日大暑07月23日\n\n立秋08月07日处暑08月23日白露09月07日秋分09月23日寒露10月08日霜降10月23日\n\n立冬11月07日小雪11月22日大雪12月07日冬至12月22日小寒01月05日大寒01月20日'
data_str = data_str.replace('\n','')
#https://jieqi.bmcx.com/
#document.querySelector('div.jieqi_chun').textContent+document.querySelector('div.jieqi_xia').textContent+document.querySelector('div.jieqi_qiu').textContent+document.querySelector('div.jieqi_dong').textContent
# 创建一个空字典
result = []
solarTerms = {}
# 提取节气名称及对应日期
# 由于每个节气名称可以是两个汉字，后面跟日期（格式：MM月DD日）
# 采用逐个字符解析
i = 0
length = len(data_str)
while i < length:
    # 找到节气名称（两个汉字）
    # 这里假设节气名称都由两个汉字组成
    if i + 4 <= length:
        name = data_str[i:i+2]
        i += 2
        # 提取日期部分（格式为：MM月DD日）
        date_str = data_str[i:i+6]  # 例如 '02月03日'
        i += 6
        # 转换日期格式为 'MM-DD'
        month_day = str(date.now().year+1) + '-' + date_str.replace('月', '-').replace('日', '')
        # 存入字典
        solarTerms["date"] = month_day
        solarTerms["name"] = name
        print(solarTerms,',')
        #result.append({"date":month_day,"name":name})
    else:
        # 剩余字符不足，结束
        break

# 输出结果为JSON格式
json_output = json.dumps(result, ensure_ascii=False, indent=4)
print(json_output)