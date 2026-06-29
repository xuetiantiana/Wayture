import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { ElButton, ElIcon, ElImage, ElOption, ElSelect } from 'element-plus';
import 'element-plus/dist/index.css';
import './assets/style.css';
createApp(App)
    .use(router)
    .use(i18n)
    .component('el-button', ElButton)
    .component('el-icon', ElIcon)
    .component('el-image', ElImage)
    .component('el-select', ElSelect)
    .component('el-option', ElOption)
    .mount('#app');
//# sourceMappingURL=main.js.map