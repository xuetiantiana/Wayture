import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { ElButton, ElIcon, ElImage } from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/style.css';
createApp(App)
    .use(router)
    .component('el-button', ElButton)
    .component('el-icon', ElIcon)
    .component('el-image', ElImage)
    .mount('#app');
//# sourceMappingURL=main.js.map