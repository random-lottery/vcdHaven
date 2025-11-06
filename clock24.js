// Main timezone data
const timezones = [
  { name: '北京', zone: 'Asia/Shanghai', flag: '🇨🇳' },
  { name: '伦敦', zone: 'Europe/London', flag: '🇬🇧' },
  { name: '纽约', zone: 'America/New_York', flag: '🇺🇸' },
  { name: '东京', zone: 'Asia/Tokyo', flag: '🇯🇵' },
  { name: '悉尼', zone: 'Australia/Sydney', flag: '🇦🇺' },
  { name: '巴黎', zone: 'Europe/Paris', flag: '🇫🇷' },
  { name: '莫斯科', zone: 'Europe/Moscow', flag: '🇷🇺' },
  { name: '洛杉矶', zone: 'America/Los_Angeles', flag: '🇺🇸' },
  { name: '迪拜', zone: 'Asia/Dubai', flag: '🇦🇪' },
  { name: '新加坡', zone: 'Asia/Singapore', flag: '🇸🇬' }
];

// 2025年主要节假日数据
const holidays = {
  '2025-01-01': '元旦',
  '2025-01-29': '春节',
  '2025-01-30': '春节',
  '2025-01-31': '春节',
  '2025-02-01': '春节',
  '2025-02-02': '春节',
  '2025-04-04': '清明节',
  '2025-05-01': '劳动节',
  '2025-06-25': '端午节',
  '2025-09-29': '中秋节',
  '2025-10-01': '国庆节',
  '2025-10-02': '国庆节',
  '2025-10-03': '国庆节',
  '2025-10-04': '国庆节',
  '2025-10-05': '国庆节'
};

// 2025年二十四节气数据 (简化)
const solarTerms = [
  { date: '2025-02-04', name: '立春' },
  { date: '2025-02-18', name: '雨水' },
  { date: '2025-03-05', name: '惊蛰' },
  { date: '2025-03-20', name: '春分' },
  { date: '2025-04-04', name: '清明' },
  { date: '2025-04-19', name: '谷雨' },
  { date: '2025-05-05', name: '立夏' },
  { date: '2025-05-20', name: '小满' },
  { date: '2025-06-05', name: '芒种' },
  { date: '2025-06-21', name: '夏至' },
  { date: '2025-07-06', name: '小暑' },
  { date: '2025-07-22', name: '大暑' },
  { date: '2025-08-07', name: '立秋' },
  { date: '2025-08-22', name: '处暑' },
  { date: '2025-09-07', name: '白露' },
  { date: '2025-09-22', name: '秋分' },
  { date: '2025-10-08', name: '寒露' },
  { date: '2025-10-23', name: '霜降' },
  { date: '2025-11-07', name: '立冬' },
  { date: '2025-11-22', name: '小雪' },
  { date: '2025-12-07', name: '大雪' },
  { date: '2025-12-21', name: '冬至' }
];

// 当前显示的时区
let activeTimezones = [
  { name: '北京', zone: 'Asia/Shanghai', flag: '🇨🇳' },
  { name: '伦敦', zone: 'Europe/London', flag: '🇬🇧' },
  { name: '纽约', zone: 'America/New_York', flag: '🇺🇸' }
];

// DOM元素
const clocksContainer = document.getElementById('clocksContainer');
const timezoneModal = document.getElementById('timezoneModal');
const addTimezoneBtn = document.getElementById('addTimezoneBtn');
const closeModalBtn = document.getElementById('closeModal');
const timezoneSearch = document.getElementById('timezoneSearch');
const timezoneList = document.getElementById('timezoneList');
const themeToggle = document.getElementById('themeToggle');
const currentDateEl = document.getElementById('currentDate');
const currentWeekdayEl = document.getElementById('currentWeekday');
const currentLunarEl = document.getElementById('currentLunar');
const solarTermsEl = document.getElementById('solarTerms');
const holidayInfoEl = document.getElementById('holidayInfo');
const countdownEl = document.getElementById('countdown');
let oday = Date().split(' ')[2];
// 初始化
document.addEventListener('DOMContentLoaded', () => {
  renderClocks();
  updateDateInfo();
  populateTimezoneList();
  setupEventListeners();
  
  // 每秒更新一次时间
  setInterval(() => {
    updateAllClocks();
    if (Date().split(' ')[2] !== oday){
      updateDateInfo();
      oday = Date().split(' ')[2];
    }
  }, 1000);
});

// 设置事件监听器
function setupEventListeners() {
  // 模态框控制
  addTimezoneBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  
  // 点击模态框外部关闭
  timezoneModal.addEventListener('click', (e) => {
    if (e.target === timezoneModal) {
      closeModal();
    }
  });
  
  // 时区搜索
  timezoneSearch.addEventListener('input', filterTimezones);
  
  // 主题切换
  themeToggle.addEventListener('click', toggleTheme);
}

// 渲染所有时钟
function renderClocks() {
  clocksContainer.innerHTML = '';
  
  activeTimezones.forEach((timezone, index) => {
    const clockCard = createClockCard(timezone, index);
    clocksContainer.appendChild(clockCard);
  });
  
  updateAllClocks();
}

// 创建时钟卡片
function createClockCard(timezone, index) {
  const card = document.createElement('div');
  card.className = 'bg-dark/50 border border-white/10 rounded-xl p-6 clock-shadow hover:scale-[1.02] transition-all duration-300';
  card.dataset.index = index;
  
  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center gap-2">
        <span class="text-2xl">${timezone.flag}</span>
        <div>
          <h3 class="font-bold text-lg">${timezone.name}</h3>
          <p class="text-sm text-white/60">${timezone.zone}</p>
        </div>
      </div>
      <button class="remove-timezone text-white/40 hover:text-red-400 transition-colors" data-index="${index}">
        <i class="fa fa-times"></i>
      </button>
    </div>
    
    <div class="relative flex justify-center items-center mb-4">
      <canvas class="clock-canvas" width="200" height="200" data-index="${index}"></canvas>
    </div>
    
    <div class="text-center text-sm text-white/60">
      <span class="utc-offset"></span>
      <div class="date-local mt-1"></div>
    </div>
  `;
  
  // 绑定删除时区事件
  card.querySelector('.remove-timezone').addEventListener('click', (e) => {
    const idx = parseInt(e.target.closest('.remove-timezone').dataset.index);
    if (activeTimezones.length > 1) { // 至少保留一个时区
      activeTimezones.splice(idx, 1);
      renderClocks();
    }
  });
  
  return card;
}

// 更新所有时钟
function updateAllClocks() {
  activeTimezones.forEach((timezone, index) => {
    updateClock(timezone, index);
  });
}

// 更新单个时钟
function updateClock(timezone, index) {
  const now = new Date();
  const options = { timeZone: timezone.zone };
  
  // 获取时区时间
  const timeStr = now.toLocaleString('en-US', { 
    ...options, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  });
  
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  // 更新日期
  const dateEl = document.querySelector(`.clock-canvas[data-index="${index}"]`).closest('.bg-dark\\/50').querySelector('.date-local');
  const dateStr = now.toLocaleDateString('zh-CN', { ...options, month: 'short', day: 'numeric', weekday: 'short' });
  dateEl.textContent = dateStr;
  
  // 计算UTC偏移
  const offsetEl = document.querySelector(`.clock-canvas[data-index="${index}"]`).closest('.bg-dark\\/50').querySelector('.utc-offset');
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone.zone }));
  const offset = (localDate - tzDate) / (1000 * 60 * 60);
  const hoursOffset = Math.floor(offset);
  const minutesOffset = Math.abs(Math.floor((offset % 1) * 60));
  offsetEl.textContent = `UTC${offset >= 0 ? '+' : ''}${hoursOffset}:${minutesOffset.toString().padStart(2, '0')}`;
  
  // 绘制时钟
  drawClock(index, hours, minutes, seconds);
}

// 绘制时钟（使用从clock.html改进的版本）
function drawClock(index, hours, minutes, seconds) {
  const canvas = document.querySelector(`.clock-canvas[data-index="${index}"]`);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const radius = 100;
  
  // 清除画布
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 200, 200);
  ctx.restore();
  
  // 移动原点到画布中心
  ctx.translate(radius, radius);
  
  // 绘制外圈
  ctx.beginPath();
  ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();
  
  // 绘制刻度
  ctx.save();
  ctx.rotate(-Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(radius - 15, 0);
    ctx.lineTo(radius - 8, 0);
    ctx.lineWidth = i % 3 === 0 ? 3 : 2;
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();
    ctx.rotate(Math.PI / 6);
  }
  ctx.restore();
  
  // 绘制小时数字
  ctx.save();
  ctx.rotate(-Math.PI / 2);
  for (let i = 1; i <= 12; i++) {
    const angle = i * Math.PI / 6;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(radius - 30, 0);
    ctx.rotate(-angle + Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(i.toString(), 0, 0);
    ctx.restore();
  }
  ctx.restore();
  
  // 绘制指针
  hours = hours % 12;
  
  // 时针（包含分钟的影响）
  drawHand(ctx, (hours * 30 + minutes * 0.5), 40, 4, 'rgba(255, 255, 255, 0.9)');
  // 分针（包含秒数的影响）
  drawHand(ctx, (minutes * 6 + seconds * 0.1), 60, 3, 'rgba(255, 255, 255, 0.8)');
  // 秒针
  drawHand(ctx, seconds * 6, 75, 2, 'rgba(239, 68, 68, 0.8)');
  
  // 绘制中心点
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  
  // 重置变换
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawHand(ctx, angle, length, width, color) {
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.moveTo(0, 0);
  ctx.rotate(angle * Math.PI / 180 + 2 * Math.PI);
  ctx.lineTo(0, -length);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

// 获取农历日期
function getLunarDate(date) {
  try {
    // 检查是否加载了lunar库
    if (typeof Lunar !== 'undefined' && Lunar.fromYmd) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // 使用lunar-javascript库进行转换
      const lunar = Lunar.fromYmd(year, month, day);
      const lunarYear = lunar.getYearInChinese();
      const lunarMonth = lunar.getMonthInChinese();
      const lunarDay = lunar.getDayInChinese();
      
      return `农历: ${lunarYear}年${lunarMonth}月${lunarDay}`;
    } else {
      // 如果库未加载，使用简化算法
      return getLunarDateSimple(date);
    }
  } catch (e) {
    console.log('Lunar conversion error:', e);
    // 如果转换失败，使用简化算法
    return getLunarDateSimple(date);
  }
}

// 简化版农历转换（备用方案）
function getLunarDateSimple(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 2025年农历对照表（关键日期）
  const keyDates = [
    { solar: '2025-01-01', lunar: '甲辰年十二月初二' },
    { solar: '2025-01-29', lunar: '乙巳年正月初一' },
    { solar: '2025-02-04', lunar: '乙巳年正月初七' },
    { solar: '2025-02-18', lunar: '乙巳年正月二十' },
    { solar: '2025-03-05', lunar: '乙巳年二月初六' },
    { solar: '2025-03-20', lunar: '乙巳年二月二十一' },
    { solar: '2025-04-04', lunar: '乙巳年三月初七' },
    { solar: '2025-04-19', lunar: '乙巳年三月二十二' },
    { solar: '2025-05-05', lunar: '乙巳年四月初八' },
    { solar: '2025-05-20', lunar: '乙巳年四月二十三' },
    { solar: '2025-06-05', lunar: '乙巳年五月初十' },
    { solar: '2025-06-21', lunar: '乙巳年五月二十六' },
    { solar: '2025-07-06', lunar: '乙巳年六月十一' },
    { solar: '2025-07-22', lunar: '乙巳年六月二十七' },
    { solar: '2025-08-07', lunar: '乙巳年闰六月十四' },
    { solar: '2025-08-22', lunar: '乙巳年六月二十九' },
    { solar: '2025-09-07', lunar: '乙巳年七月十五' },
    { solar: '2025-09-22', lunar: '乙巳年八月初一' },
    { solar: '2025-10-08', lunar: '乙巳年八月十六' },
    { solar: '2025-10-23', lunar: '乙巳年九月初二' },
    { solar: '2025-11-07', lunar: '乙巳年九月十七' },
    { solar: '2025-11-22', lunar: '乙巳年十月初二' },
    { solar: '2025-12-07', lunar: '乙巳年十月十七' },
    { solar: '2025-12-21', lunar: '乙巳年十一月初二' }
  ];
  
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // 查找精确匹配
  const exactMatch = keyDates.find(d => d.solar === dateStr);
  if (exactMatch) {
    return `农历: ${exactMatch.lunar}`;
  }
  
  // 如果找不到精确匹配，找到最近的参考日期进行估算
  const sortedDates = keyDates.map(d => ({
    ...d,
    timestamp: new Date(d.solar).getTime()
  })).sort((a, b) => a.timestamp - b.timestamp);
  
  const currentTimestamp = date.getTime();
  
  // 找到最近的参考日期
  let closestDate = sortedDates[0];
  for (let i = 0; i < sortedDates.length - 1; i++) {
    if (currentTimestamp >= sortedDates[i].timestamp && currentTimestamp < sortedDates[i + 1].timestamp) {
      closestDate = sortedDates[i];
      break;
    }
    if (i === sortedDates.length - 2 && currentTimestamp >= sortedDates[i + 1].timestamp) {
      closestDate = sortedDates[i + 1];
    }
  }
  
  // 计算天数差并估算农历日期
  const daysDiff = Math.floor((currentTimestamp - new Date(closestDate.solar).getTime()) / (1000 * 60 * 60 * 24));
  
  if (year === 2025 && daysDiff >= 0 && daysDiff <= 7) {
    // 对于接近参考日期的情况，返回估算值
    return `农历: 乙巳年（约${daysDiff}天后）`;
  }
  
  return `农历: 乙巳年（请使用完整转换库）`;
}

function getFormatInt(intnumber) {
  var now_number = intnumber < 10 ? '0' + intnumber : intnumber.toString();
  return now_number;
}

function getAndSetLunarData(date) {
  const s_year = date.getFullYear();
  const s_month = date.getMonth() + 1;
  const s_date = date.getDate();
  var now_month = s_month < 10 ? '0' + s_month : s_month.toString();
  var now_day = s_date < 10 ? '0' + s_date : s_date.toString();
  var now_date = s_year.toString() + now_month + now_day;
  if (window.calendar && !is_first) {
    window.calendar.updateDate(now_date);
  }
  $.ajax({
    type: "GET",
    url: "https://v2-zhwnlapi.etouch.cn/Ecalender/openapi/huangli/" + s_year + "-" + getFormatInt(
      s_month) +
      "-" + getFormatInt(s_date) + "?key=0Uix9250MloRwgdk07IpvxU83gv09IXh&jsonpCall=call",
    dataType: "jsonp",
    jsonpCallback: "call",
    success: function (data) {
        currentLunarEl.textContent = data.data.date.slice(8);
      if (data.status == 1000) {
        var temp = data.data.date.split("-");
        //currentLunarEl.textContent = temp[temp.length - 1];
        temp = data.data.tgdz.split(",");
        currentLunarEl.innerHTML = temp[0].substring(0, 2) + temp[1] + "&nbsp;" + data.data.nongli 
         + "&nbsp;" + temp[2] + "&nbsp;" + temp[3];
        
        /*黄历宜忌*/
        var yi = data.data.yi;
        var ji = data.data.ji;
        var y_desc_one = "";
        var y_desc_two = "";
        var y_desc_three = "";
        var j_desc_one = "";
        var j_desc_two = "";
        if (yi.length > 4) {
          for (var i = 0; i < 4; i++) {
            y_desc_one += "<li>" + yi[i].old + "</li>";
          }
          if (yi.length > 4 && yi.length < 8) {
            for (var j = 4; j < yi.length; j++) {
              y_desc_two += "<li>" + yi[j].old + "</li>";
            }
            $(".yi-three").css({
              display: 'none'
            })
          }
          if (yi.length == 8) {
            for (var j = 4; j < 8; j++) {
              y_desc_two += "<li>" + yi[j].old + "</li>";
            }
            $(".yi-three").css({
              display: 'none'
            })
          }
          if (yi.length > 8) {
            $(".yi-two").css({
              display: 'block'
            })
            if (yi.length > 12) {
              yi = yi.slice(0, 10);
            }
            for (var j = 4; j < 8; j++) {
              y_desc_two += "<li>" + yi[j].old + "</li>";
            }
            for (var o = 8; o < yi.length; o++) {
              y_desc_three += "<li>" + yi[o].old + "</li>";
            }
            $(".yi-three").css({
              display: 'block'
            })
          }
        } else {
          for (var i = 0; i < yi.length; i++) {
            if (yi[i].old) {
              y_desc_one += "<li>" + yi[i].old + "</li>";
            } else {
              y_desc_one += "<li>无</li>";
            }
          }
          $(".yi-three").css({
            display: 'none'
          })
          $(".yi-two").css({
            display: 'none'
          })
        }
        if (ji.length > 4) {
          for (var l = 0; l < 4; l++) {
            j_desc_one += "<li>" + ji[l].old + "</li>";
          }
          for (var k = 4; k < ji.length; k++) {
            j_desc_two += "<li>" + ji[k].old + "</li>";
          }
          $(".today_bad ul").css({
            float: 'right',
            margin: '0 2px'
          })
        } else {
          for (var i = 0; i < ji.length; i++) {
            if (ji[i].old) {
              j_desc_one += "<li>" + ji[i].old + "</li>";
            } else {
              j_desc_one += "<li>无</li>";
            }
          }
          $(".today_bad ul").css({
            float: 'none',
            margin: '0 auto'
          })
        }
        $(".yi-one").html(y_desc_one);
        $(".yi-two").html(y_desc_two);
        $(".yi-three").html(y_desc_three);
        $(".ji-one").html(j_desc_one);
        $(".ji-two").html(j_desc_two);
      }
    },
    error: function () {
      currentLunarEl.textContent = '获取农历数据失败';
    }
  });
}
// 更新日期信息
function updateDateInfo() {
  const now = new Date();
  const options = { timeZone: 'Asia/Shanghai' }; // 使用北京时间作为标准显示节假日
  
  // 格式化日期
  const dateStr = now.toLocaleDateString('zh-CN', { ...options, year: 'numeric', month: 'long', day: 'numeric' });
  currentDateEl.textContent = dateStr;
  
  // 星期
  const weekday = now.toLocaleDateString('zh-CN', { ...options, weekday: 'long' });
  currentWeekdayEl.textContent = weekday;
  
  // 农历计算
  //currentLunarEl.textContent = getLunarDate(now);
  getAndSetLunarData(now);
  
  // 节气
  const todayStr = now.toISOString().split('T')[0];
  const currentTerm = solarTerms.find(term => term.date === todayStr);
  solarTermsEl.textContent = currentTerm ? `今日${currentTerm.name}` : getNextSolarTerm(now);
  
  // 节假日
  const holiday = holidays[todayStr];
  holidayInfoEl.textContent = holiday ? `${holiday}假期` : '无节假日';
  
  // 倒计时到下一个个节假日
  countdownEl.textContent = getNextHolidayCountdown(now);
}

// 获取下一个节气
function getNextSolarTerm(currentDate) {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  
  for (const term of solarTerms) {
    const termDate = new Date(term.date);
    if (termDate > today) {
      const daysDiff = Math.ceil((termDate - today) / (1000 * 60 * 60 * 24));
      return `距离${term.name}还有${daysDiff}天`;
    }
  }
  
  // 如果所有的节气都已经过了，显示明年的第一个
  const nextYear = currentDate.getFullYear() + 1;
  return `距离${solarTerms[0].name}还有${365}天`;
}

// 获取距离下一个节假日的倒计时
function getNextHolidayCountdown(currentDate) {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  
  // 获取所有节假日日期
  const holidayDates = Object.keys(holidays).map(date => new Date(date));
  
  // 找到下一个节假日
  let nextHoliday = null;
  let nextHolidayName = '';
  
  for (const dateStr of Object.keys(holidays)) {
    const date = new Date(dateStr);
    if (date >= today) {
      if (!nextHoliday || date < nextHoliday) {
        nextHoliday = date;
        nextHolidayName = holidays[dateStr];
      }
    }
  }
  
  // 如果今年没有节假日了，查找明年
  if (!nextHoliday) {
    const nextYear = currentDate.getFullYear() + 1;
    const firstHolidayDateStr = Object.keys(holidays).sort()[0].replace(/^\d+/, nextYear);
    nextHoliday = new Date(firstHolidayDateStr);
    nextHolidayName = holidays[Object.keys(holidays).sort()[0]];
  }
  
  // 计算倒计时
  const daysDiff = Math.ceil((nextHoliday - today) / (1000 * 60 * 60 * 24));
  const holidayDateStr = nextHoliday.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  
  return `距离${nextHolidayName}还有${daysDiff}天 (${holidayDateStr})`;
}

// 填充时区列表
function populateTimezoneList() {
  timezoneList.innerHTML = '';
  
  timezones.forEach(timezone => {
    // 检查是否已添加
    const isAdded = activeTimezones.some(t => t.zone === timezone.zone);
    
    const item = document.createElement('div');
    item.className = `flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
      isAdded ? 'bg-primary/20 text-primary' : 'hover:bg-white/5'
    }`;
    item.innerHTML = `
      <span class="text-xl">${timezone.flag}</span>
      <div>
        <div class="font-medium">${timezone.name}</div>
        <div class="text-xs text-white/60">${timezone.zone}</div>
      </div>
      ${isAdded ? '<i class="fa fa-check ml-auto text-sm"></i>' : ''}
    `;
    
    if (!isAdded) {
      item.addEventListener('click', () => {
        activeTimezones.push(timezone);
        renderClocks();
        closeModal();
      });
    }
    
    timezoneList.appendChild(item);
  });
}

// 过滤时区
function filterTimezones() {
  const searchTerm = timezoneSearch.value.toLowerCase();
  const items = timezoneList.querySelectorAll('div');
  
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// 打开模态框
function openModal() {
  timezoneModal.classList.remove('opacity-0', 'pointer-events-none');
  timezoneModal.querySelector('div').classList.remove('scale-95');
  timezoneModal.querySelector('div').classList.add('scale-100');
  timezoneSearch.focus();
}

// 关闭模态框
function closeModal() {
  timezoneModal.classList.add('opacity-0', 'pointer-events-none');
  timezoneModal.querySelector('div').classList.remove('scale-100');
  timezoneModal.querySelector('div').classList.add('scale-95');
  timezoneSearch.value = '';
  populateTimezoneList(); // 重置列表
}

// 切换主题
function toggleTheme() {
  document.body.classList.toggle('from-light');
  document.body.classList.toggle('to-slate-200');
  document.body.classList.toggle('from-dark');
  document.body.classList.toggle('to-slate-800');
  document.body.classList.toggle('text-dark');
  document.body.classList.toggle('text-light');
  
  const icon = themeToggle.querySelector('i');
  if (icon.classList.contains('fa-moon-o')) {
    icon.classList.replace('fa-moon-o', 'fa-sun-o');
  } else {
    icon.classList.replace('fa-sun-o', 'fa-moon-o');
  }
}
