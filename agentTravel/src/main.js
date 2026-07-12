 // ============================================================
// 模块导入
// ============================================================
/**
 * createApp：Vue 3 的入口函数，用于创建应用实例
 */
import { createApp } from 'vue'

// 导入根组件 App
// App.vue 是整个应用的根组件，所有其他组件都是它的子组件
import App from './App.vue'

/**
 * Vant：移动端 UI 组件库
 * 提供导航栏、按钮、表单、弹出层等移动端组件
 * 选择 Vant 是因为它专门为移动端设计，组件丰富，文档友好
 */
import Vant from 'vant'

/**
 * Vant 的样式文件
 * 必须导入，否则 Vant 组件没有样式
 * 注意：需要在组件注册之前导入
 */
import 'vant/lib/index.css'

/**
 * Vue Router：路由管理器
 * 实现页面之间的切换，管理 URL 和组件的映射关系
 * 在 SPA（单页应用）中，页面切换不刷新浏览器，通过路由实现
 */
import router from './router'

/**
 * Pinia：Vue 3 官方推荐的状态管理库
 * 替代 Vuex，TypeScript 友好，模块化设计
 * 用于管理跨页面共享的行程数据、历史记录等
 */
import { createPinia } from 'pinia'

/**
 * 全局样式文件
 * 定义全局 CSS 变量、公共样式、重置样式等
 * 会被应用到所有组件
 */
import '@/styles/common.css'

// ============================================================
// 创建 Vue 应用实例
// ============================================================

/**
 * createApp(App)：创建 Vue 应用实例
 * 参数 App 是根组件，所有其他组件都挂载在它下面
 * 
 * 返回值 app 是应用实例，可以链式调用 .use()、.mount() 等方法
 */
const app = createApp(App)

// ============================================================
// 注册插件
// ============================================================

/**
 * app.use(Vant)：注册 Vant 组件库
 * 注册后，所有 Vant 组件（如 van-button、van-field 等）都可以在模板中直接使用
 * 不需要在每个组件中单独导入
 * Vant 内部会批量注册所有组件
 */
app.use(Vant)

/**
 * app.use(router)：注册 Vue Router
 * 注册后，模板中可以使用 <RouterView /> 和 <RouterLink /> 组件
 * 同时 $router 和 $route 会注入到所有组件中
 * 
 * 注意：router 是 import 进来的路由实例，已经在 router/index.js 中配置好了
 */
app.use(router)

/**
 * app.use(createPinia())：注册 Pinia
 * 注册后，所有组件可以通过 useXxxStore() 访问状态
 * Pinia 内部会创建一个根 Store 实例并注入到所有组件中
 */
app.use(createPinia())

// ============================================================
// 挂载应用
// ============================================================

/**
 * app.mount('#app')：将 Vue 应用挂载到 DOM 上
 * 
 * 参数 '#app' 是 CSS 选择器，对应 index.html 中的 <div id="app"></div>
 * 
 * 执行过程：
 * 1. 读取 index.html 中的 <div id="app"></div>
 * 2. 将 App.vue 渲染成 DOM 节点
 * 3. 替换掉 #app 元素内的内容
 * 4. 建立响应式系统，开始监听数据变化
 * 
 * 此时页面就"活"了，Vue 接管了页面控制权
 */
app.mount('#app')

// ============================================================
// 总结：整个应用的启动流程
// ============================================================

/**
 * 1. 用户打开页面 → 浏览器加载 index.html
 * 2. index.html 加载 main.js（通过 script 标签或 Vite 构建）
 * 3. main.js 执行：
 *    a. 导入依赖（Vue、Vant、Router、App）
 *    b. 创建 Vue 应用实例（createApp(App)）
 *    c. 注册插件（Vant、Router）
 *    d. 挂载到 DOM（app.mount('#app')）
 * 4. 页面渲染完成，用户可以看到内容
 * 5. 用户交互 → Vue 响应式系统更新 → 页面重新渲染
 */
