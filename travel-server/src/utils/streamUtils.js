// ====================== SSE 长流式推送工具（专门实现AI打字机效果） ======================
/**
 * 生成一套SSE推送工具，用来持续给前端一段一段发文字
 * 简单讲SSE是啥：
 * 1. 浏览器和服务器建立一条不会立刻断掉的长链接
 * 2. 只能服务器主动发数据给前端，前端不用反复发请求刷新
 * 3. 代码简单、浏览器原生自带支持，不用装额外插件
 *
 * 适合咱们项目的场景：
 * AI聊天页面逐字弹出回复、实时进度提示
 *
 * 为啥不用WebSocket，偏偏选SSE？
 * 咱们这里只需要后端单向把AI文字推给前端，前端不用发消息给后端
 * WebSocket是双向收发，功能太重，代码写起来麻烦；SSE轻量省事刚好够用
 *
 * @param {Object} res - Express框架自带的响应对象，用来向前端返回数据
 * @returns {Object} 三个可用函数：send推送内容、end正常结束、error报错关闭
 */
/**
 * 生成一套SSE推送工具，用来持续给前端一段一段发文字
 * @param {import('express').Response} res - Express 响应对象
 * @returns {{ send: (data: any) => void, end: () => void, error: (message: any) => void }} 三个操作函数
 */
export const createStreamResponse = (res) => {
    
    // ====================== 先设置浏览器识别长流必须的请求头 ======================
    /**
     * Content-Type: text/event-stream
     * 告诉浏览器：这次返回的不是普通JSON接口，是持续推送的数据流
     * 浏览器收到这个标识后，会一直保持连接等着接收新内容
     */
    res.setHeader('Content-Type', 'text/event-stream')
    
    /**
     * Cache-Control: no-cache
     * 不让浏览器缓存这次的返回内容
     * 如果开了缓存，前端会读到之前旧的AI文字，造成显示错乱
     */
    res.setHeader('Cache-Control', 'no-cache')
    
    /**
     * Connection: keep-alive
     * 保持网络连接不自动断开
     * 普通接口拿到返回数据后连接直接断掉，流式需要一直连着持续发内容
     */
    res.setHeader('Connection', 'keep-alive')

    // ====================== 向外暴露三个操作方法，给路由接口调用 ======================
    return {
        /**
         * send：把一段文字/数据实时推送给前端
         * 固定格式要求（SSE协议强制规定，不能乱改）：
         * 1. 每段数据开头必须写 data:
         * 2. 内容转成JSON字符串传输
         * 3. 末尾加两个换行 \n\n 代表这条消息发送完毕
         *
         * 前端怎么接收：
         * 前端用EventSource监听 onmessage 事件就能拿到推送的数据
         *
         * @param {*} data 需要发给前端的内容（AI每一小段回复文字）
         */
        send: (data) => {
            try {
                // 按照SSE标准格式，把数据写给前端
                res.write(`data:${JSON.stringify(data)}\n\n`)
            } catch (error) {
                console.error('推送流式内容出错:', error)
            }
        },

        /**
         * end：AI全部回答完毕，正常关闭这条长连接
         * 执行逻辑：
         * 1. 单独发送一个名为end的事件，通知前端：AI内容全部发完了
         * 2. 关闭浏览器和服务器之间的连接
         *
         * 前端怎么监听结束：
         * 前端单独监听 end 事件，收到后停止加载动画
         */
        end: () => {
            try {
                // 发送结束标记事件
                res.write('event:end\ndata:{"done":true}\n\n')
                // 正式断开连接
                res.end()
            } catch (error) {
                console.error('关闭流式连接失败:', error)
            }
        },

        /**
         * error：AI调用出错时，终止推送并关闭连接
         * 和end正常结束的区别：
         * end是AI正常写完内容收尾；error是中途出故障，推送中断
         *
         * @param {*} message 要传给前端的错误提示文字
         */
        error: (message) => {
            try {
                // 把错误信息推送给前端
                res.write(`data:${JSON.stringify(message)}\n\n`)
                // 直接关闭连接
                res.end()
            } catch (error) {
                console.error('流式报错处理失败:', error)
            }
        }
    }
}