// ============================================================
// 行程导出工具
// 功能：将 AI 生成的行程数据转换为可分享的文本格式
// 场景：复制到剪贴板、分享给好友、保存到备忘录
// ============================================================

/**
 * 将行程数据转换为纯文本格式
 * @param {Object} trip - 行程数据对象
 * @returns {string} 格式化后的文本
 */
export function exportTripAsText(trip) {
  if (!trip) return ''

  const lines = []

  // 标题
  lines.push(`【${trip.city} ${trip.days}天旅游攻略】`)
  lines.push(`总预算：¥${trip.totalBudget}`)
  lines.push('')

  // 每日行程
  if (trip.dailyItinerary && trip.dailyItinerary.length) {
    lines.push('━━━━━━━━━━━━')
    lines.push('📅 每日行程')
    lines.push('━━━━━━━━━━━━')
    lines.push('')

    trip.dailyItinerary.forEach(day => {
      lines.push(`📍 第${day.day}天`)
      lines.push('')

      if (day.morning) {
        lines.push(`🌅 上午：${day.morning.spot || day.morning.name || ''}`)
        if (day.morning.duration) lines.push(`   ⏱ 时长：${day.morning.duration}`)
        if (day.morning.ticket) lines.push(`   🎫 门票：${day.morning.ticket}`)
        if (day.morning.transportation) lines.push(`   🚗 交通：${day.morning.transportation}`)
        if (day.morning.description) lines.push(`   📝 ${day.morning.description}`)
        lines.push('')
      }

      if (day.afternoon) {
        lines.push(`☀️ 下午：${day.afternoon.spot || day.afternoon.name || ''}`)
        if (day.afternoon.duration) lines.push(`   ⏱ 时长：${day.afternoon.duration}`)
        if (day.afternoon.ticket) lines.push(`   🎫 门票：${day.afternoon.ticket}`)
        if (day.afternoon.transportation) lines.push(`   🚗 交通：${day.afternoon.transportation}`)
        if (day.afternoon.description) lines.push(`   📝 ${day.afternoon.description}`)
        lines.push('')
      }

      if (day.evening) {
        lines.push(`🌙 晚上：${day.evening.spot || day.evening.name || ''}`)
        if (day.evening.duration) lines.push(`   ⏱ 时长：${day.evening.duration}`)
        if (day.evening.ticket) lines.push(`   💰 花费：${day.evening.ticket}`)
        if (day.evening.transportation) lines.push(`   🚗 交通：${day.evening.transportation}`)
        if (day.evening.description) lines.push(`   📝 ${day.evening.description}`)
        lines.push('')
      }

      lines.push('')
    })
  }

  // 预算明细
  if (trip.budgetBreakdown) {
    lines.push('━━━━━━━━━━━━')
    lines.push('💰 预算明细')
    lines.push('━━━━━━━━━━━━')
    lines.push('')

    const budgetMap = {
      accommodation: '🏨 住宿',
      food: '🍜 餐饮',
      transportation: '🚗 交通',
      tickets: '🎫 门票',
      other: '📦 其他'
    }

    Object.keys(trip.budgetBreakdown).forEach(key => {
      const label = budgetMap[key] || key
      const amount = trip.budgetBreakdown[key]
      lines.push(`${label}：¥${amount}`)
    })

    lines.push('')
    lines.push(`💵 总计：¥${trip.totalBudget}`)
    lines.push('')
  }

  // 温馨提示
  if (trip.tips && trip.tips.length) {
    lines.push('━━━━━━━━━━━━')
    lines.push('💡 温馨提示')
    lines.push('━━━━━━━━━━━━')
    lines.push('')
    trip.tips.forEach((tip, i) => {
      lines.push(`${i + 1}. ${tip}`)
    })
    lines.push('')
  }

  // 注意事项
  if (trip.warnings && trip.warnings.length) {
    lines.push('━━━━━━━━━━━━')
    lines.push('⚠️ 注意事项')
    lines.push('━━━━━━━━━━━━')
    lines.push('')
    trip.warnings.forEach((w, i) => {
      lines.push(`${i + 1}. ${w}`)
    })
    lines.push('')
  }

  // 页脚
  lines.push('——————————————')
  lines.push('由「智能旅游助手」生成')

  return lines.join('\n')
}

/**
 * 估算行程文本的字数
 * @param {Object} trip
 * @returns {number}
 */
export function estimateTripLength(trip) {
  if (!trip) return 0
  return exportTripAsText(trip).length
}

export default {
  exportAsText: exportTripAsText,
  estimateLength: estimateTripLength
}
